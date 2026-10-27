import { ComponentRef, EnvironmentInjector, createComponent } from '@angular/core';
import { MenuRenderComponent } from '../menu-render.component';
import {
  LANDING_MENU_CONTENT,
  LANDING_MENU_PRESETS,
  LandingMenuPresetId,
  ResolvedMenuTheme,
  resolveLandingTheme,
} from '../landing-menu-presets';
import { SCAN_CARD, SCREEN, SceneLayout, cardRect, qrCell } from './scene-layouts';
import {
  Rect,
  bezier,
  clamp,
  css,
  ease as easeSlow,
  easeIO as easeIOSlow,
  expoIO as expoIOSlow,
  lerp,
  lerpRect,
  mixHex,
  mixRgb,
  prog,
  rgb,
  setStyle,
  spring,
  tabulate,
} from './scene-math';

/** Courbes tabulées (voir `tabulate`) : mêmes valeurs que la v1, évaluation en O(1). */
const ease = tabulate(easeSlow);
const easeIO = tabulate(easeIOSlow);
const expoIO = tabulate(expoIOSlow);

/**
 * Scène cinématique du hero de la landing — port du prototype `motion-concepts/karta-hero/`.
 * Tout l'état visuel est une fonction pure de `t` (secondes, 0 → 14) : `seek(t)` pose l'image exacte,
 * sans état accumulé. Même `t` → même image, que l'on avance ou que l'on recule : c'est ce qui permet
 * de la brancher sur le scroll (voir `ScrollDriver`). Le menu dans le téléphone est le vrai
 * `MenuRenderComponent` de la landing.
 *
 * Chronologie :
 *   0–2 s    le QR se construit sur la carte de table
 *   2–4 s    le téléphone vise le QR, le viseur se verrouille, tap sur le lien
 *   3,6–5,2  le QR devient le menu : lamelles → 25 traits → filets réels → texte
 *   5–8 s    le menu défile, un prix change (le QR, jamais)
 *   8–10 s   styles réels : Modern → Street Food → Luxe, en front qui descend dans le menu
 *   10–12 s  l'écran Luxe se contracte en carré et se résout en QR ; la topographie se révèle
 *   12–14 s  composition finale
 *
 * Performance (causes mesurées, à ne pas réintroduire) :
 *  - le monde et la grille sont des calques de compositing ; la topographie est faite de bandes dont
 *    seule l'opacité s'anime (sinon : 23 à 59 ms de raster par image) ;
 *  - un calque de menu PAR STYLE, thématisé une fois : changer de style ne recalcule pas le CSS ;
 *  - courbes de scrub à pente nulle au départ et à l'arrivée, tabulées (évaluation en O(1)).
 */

export const DURATION = 14;

const QR = [
  '1111111001001010101111111', '1000001001100101001000001', '1011101010001000101011101', '1011101010111101001011101',
  '1011101010111100101011101', '1000001011110111001000001', '1111111010101010101111111', '0000000010010010100000000',
  '1011111001111100001111100', '1111010100100100000100010', '1110111110001111001111011', '0111010111000010011010001',
  '1001111011110001111010111', '1111010001001100110101010', '1000101010100111101111011', '1001010111001101000110001',
  '1011011011001011111110100', '0000000011000000100011000', '1111111000011000101010111', '1000001011110010100011001',
  '1011101011010001111110111', '1011101010001110011011111', '1011101011100111010001101', '1000001000001101111111001',
  '1111111011101010001111111',
];

const UPDATED = ['Classic Smash Burger', '12,50 €', '13,00 €'] as const;
const MORPH = 0.55;
const rowStart = (r: number): number => 4.0 + 0.012 * r;
const groupAt = (j: number): number => (j < 2 ? 4.6 + 0.04 * j : 4.7 + 0.04 * (j - 2));
const groupHideAt = (j: number): number => 10 + 0.012 * j;

/** Courbes de scrub : pente de départ et d'arrivée ≈ 0, pente max ≤ 3 (voir engine.spec.ts). */
export const REV = tabulate(bezier(0.22, 0, 0.12, 1));
const EIO = tabulate(bezier(0.45, 0, 0.55, 1));
const SMOOTH = (x: number): number => x * x * (3 - 2 * x);

/** Les trois styles de la chronologie : Modern → Street Food (8,0–8,9 s) → Luxe (9,0–9,9 s). */
export const STYLE_FLOW: readonly { id: LandingMenuPresetId; at: number }[] = [
  { id: 'modern', at: -99 },
  { id: 'street_food', at: 8.0 },
  { id: 'luxe', at: 9.0 },
];
export const STYLE_WINDOW = 0.9;
const FILM_STYLES: LandingMenuPresetId[] = ['modern', 'street_food', 'luxe'];

const SB_ICONS =
  '<span><svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.5 10.5 0 0 0 8 .3 10.5 10.5 0 0 0 .7 3.2L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.8c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4.1c-1.8 0-3.5.7-4.7 1.8l1.3 1.4C5.5 6.5 6.7 6 8 6Zm0 3.7-2 2.1h4l-2-2.1Z"/></svg><svg viewBox="0 0 27 12" fill="none"><rect x=".5" y=".5" width="22" height="11" rx="3" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="1.6" fill="currentColor"/><path d="M24.5 4v4a2 2 0 0 0 0-4Z" fill="currentColor" opacity=".45"/></svg></span>';
const SB_HTML = '<span>12:30</span>' + SB_ICONS;
const LOCK =
  '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M3.5 5V3.6a2.5 2.5 0 0 1 5 0V5h.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h.5Zm1.2 0h2.6V3.6a1.3 1.3 0 0 0-2.6 0V5Z"/></svg>';

export interface SceneConfig {
  layout: SceneLayout;
  injector: EnvironmentInjector;
  /** Bandes topographiques, de l'intérieure à l'extérieure (leur emprise vient du gabarit). */
  topoUrls: readonly [string, string, string];
}

interface Group {
  els: HTMLElement[];
  h: number;
  /** Position verticale normalisée (0 = haut de l'écran, 1 = bas) : cadence de la vague de lecture. */
  n: number;
  /** Visible à l'écran dans l'état défilé : seuls ces groupes sont animés pendant un changement de style. */
  on: boolean;
}
interface Layer {
  id: LandingMenuPresetId;
  el: HTMLElement;
  ref: ComponentRef<MenuRenderComponent>;
  mr: HTMLElement;
  sheet: HTMLElement;
  km: HTMLElement;
  scroll: HTMLElement;
  sb: HTMLElement;
  ub: HTMLElement;
  home: HTMLElement;
  fade: HTMLElement;
  groups: Group[];
  pvi: HTMLElement;
  row: HTMLElement;
  theme: ResolvedMenuTheme;
  /** 'steady' : tous les groupes sont à leur état final, rien à réécrire. */
  state: string;
}
interface Line {
  el: HTMLElement;
  prop: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number[];
  land: number;
}
interface RowTarget {
  line: number;
  x: number;
  w: number;
}
interface Module {
  r: number;
  c: number;
  k: number;
  enter: number;
  el: HTMLElement;
}
export interface StyleState {
  a: LandingMenuPresetId;
  b: LandingMenuPresetId | null;
  /** Progression linéaire de la transition, 0 → 1. */
  q: number;
}

function q<T extends HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`KartaScene : ${sel} introuvable`);
  return el;
}

export class KartaScene {
  private readonly layout: SceneLayout;
  private readonly themes = {} as Record<LandingMenuPresetId, ResolvedMenuTheme>;
  private layers = new Map<LandingMenuPresetId, Layer>();
  private world!: HTMLElement;
  private grid!: HTMLElement;
  private flood!: HTMLElement;
  private card!: HTMLElement;
  private cap!: HTMLElement;
  private phone!: HTMLElement;
  private screenBg!: HTMLElement;
  private cam!: HTMLElement;
  private hole!: HTMLElement;
  private brs: HTMLElement[] = [];
  private pill!: HTMLElement;
  private ripple!: HTMLElement;
  private fbr!: HTMLElement;
  private modulesEl!: HTMLElement;
  private topoWrap!: HTMLElement;
  private topoImgs: HTMLElement[] = [];
  private modules: Module[] = [];
  private rowCount: number[] = Array(25).fill(0);
  private scrollOf = {} as Record<LandingMenuPresetId, number>;
  private lines: Line[] = [];
  private rows: RowTarget[] = [];
  private revealDone = 0;
  private destroyed = false;

  private constructor(
    private readonly host: HTMLElement,
    private readonly cfg: SceneConfig,
  ) {
    this.layout = cfg.layout;
    for (const p of LANDING_MENU_PRESETS) this.themes[p.id] = resolveLandingTheme(p, null, null);
  }

  static create(host: HTMLElement, cfg: SceneConfig): KartaScene {
    const s = new KartaScene(host, cfg);
    s.build();
    s.measure();
    s.seek(0);
    return s;
  }

  destroy(): void {
    this.destroyed = true;
    for (const L of this.layers.values()) L.ref.destroy();
    this.layers.clear();
    this.host.replaceChildren();
  }

  /** Style montré à l'instant `t` : fonction pure du temps. */
  styleAt(t: number): StyleState {
    if (t >= 10.9) return { a: 'modern', b: null, q: 1 };
    let i = 0;
    STYLE_FLOW.forEach((s, j) => {
      if (t >= s.at) i = j;
    });
    if (i === 0) return { a: STYLE_FLOW[0].id, b: null, q: 1 };
    const qq = prog(t, STYLE_FLOW[i].at, STYLE_WINDOW);
    return qq < 1 ? { a: STYLE_FLOW[i - 1].id, b: STYLE_FLOW[i].id, q: qq } : { a: STYLE_FLOW[i].id, b: null, q: 1 };
  }

  /** Style dominant (pour surligner son nom). */
  shownPreset(t: number): LandingMenuPresetId {
    const s = this.styleAt(t);
    return s.b && s.q > 0.5 ? s.b : s.a;
  }

  /** Accent du style montré, interpolé pendant la transition (pour teinter l'habillage). */
  accentAt(t: number): string {
    const s = this.styleAt(t);
    const a = this.themes[s.a].accent;
    return s.b ? mixHex(a, this.themes[s.b].accent, SMOOTH(s.q)) : a;
  }

  /* ── Construction ───────────────────────────────────────────────────── */

  private build(): void {
    const { W, H } = this.layout;
    const tp = { ...this.layout.topo, urls: this.cfg.topoUrls };
    this.host.innerHTML = `
<div class="ks-topo2" style="left:${tp.left}px;top:${tp.top}px;width:${tp.w}px;height:${tp.h}px">
  <img alt="" draggable="false"><img alt="" draggable="false"><img alt="" draggable="false">
</div>
<div class="ks-world" style="left:${W / 2 - 960}px;top:${H / 2 - 540}px">
  <div class="ks-gridw"><div class="ks-grid"></div></div>
  <div class="ks-flood"></div>
  <div class="ks-card"><div class="ks-cap">kartaqr.fr</div></div>
  <div class="ks-phone">
    <div class="ks-screen">
      <div class="ks-screenbg"></div>
      <div class="ks-cam">
        <div class="ks-hole"></div>
        <div class="ks-sb ks-sb-cam" style="color:#fff">${SB_HTML}</div>
        <div class="ks-br ks-tl"></div><div class="ks-br ks-tr"></div><div class="ks-br ks-bl"></div><div class="ks-br ks-bf"></div>
        <div class="ks-ripple"></div>
        <div class="ks-pill"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.25"/><path d="M1.75 8h12.5M8 1.75c1.8 2 2.6 4 2.6 6.25S9.8 12.25 8 14.25M8 1.75C6.2 3.75 5.4 5.75 5.4 8s.8 4.25 2.6 6.25"/></svg>api.kartaqr.fr</div>
        <div class="ks-band">PHOTO<div class="ks-shutter"><i></i></div></div>
      </div>
      <div class="ks-island"></div>
    </div>
  </div>
  <div class="ks-modules"></div>
  <div class="ks-fbr"><div class="ks-br ks-tl"></div><div class="ks-br ks-tr"></div><div class="ks-br ks-bl"></div><div class="ks-br ks-bf"></div></div>
</div>`;
    const h = this.host;
    this.topoWrap = q(h, '.ks-topo2');
    this.topoImgs = Array.from(this.topoWrap.querySelectorAll<HTMLElement>('img'));
    this.topoImgs.forEach((im, i) => ((im as HTMLImageElement).src = tp.urls[i]));
    this.world = q(h, '.ks-world');
    this.grid = q(h, '.ks-gridw');
    this.flood = q(h, '.ks-flood');
    this.card = q(h, '.ks-card');
    this.cap = q(h, '.ks-cap');
    this.phone = q(h, '.ks-phone');
    this.screenBg = q(h, '.ks-screenbg');
    this.cam = q(h, '.ks-cam');
    this.hole = q(h, '.ks-hole');
    this.brs = Array.from(this.cam.querySelectorAll<HTMLElement>('.ks-br'));
    this.pill = q(h, '.ks-pill');
    this.ripple = q(h, '.ks-ripple');
    this.fbr = q(h, '.ks-fbr');
    this.modulesEl = q(h, '.ks-modules');

    // Un calque par style, insérés avant l'interface appareil photo.
    const screen = q(h, '.ks-screen');
    for (const id of FILM_STYLES) {
      const el = document.createElement('div');
      el.className = 'ks-layer';
      screen.insertBefore(el, this.cam);
      this.layers.set(id, this.makeLayer(id, el));
    }

    QR.forEach((row, r) =>
      Array.from(row).forEach((v, c) => {
        if (v !== '1') return;
        const el = document.createElement('i');
        this.modulesEl.appendChild(el);
        const finder = (r < 7 && c < 7) || (r < 7 && c > 17) || (r > 17 && c < 7);
        let enter: number;
        if (finder) {
          const fr = r < 7 ? 3 : 21;
          const fc = c < 7 ? 3 : 21;
          enter = 0.25 + 0.06 * (3 - Math.max(Math.abs(r - fr), Math.abs(c - fc)));
        } else enter = 0.62 + 0.86 * ((r + c) / 48);
        this.modules.push({ r, c, k: this.rowCount[r]++, enter, el });
      }),
    );
  }

  private makeLayer(id: LandingMenuPresetId, el: HTMLElement): Layer {
    const theme = this.themes[id];
    el.innerHTML =
      '<div class="ks-km"><div class="ks-kscroll"><menu-render></menu-render></div><div class="ks-fade"></div>' +
      `<div class="ks-sb">${SB_HTML}</div><div class="ks-ub">${LOCK}api.kartaqr.fr</div><div class="ks-home"></div></div>`;
    const mr = q(el, 'menu-render');
    const ref = createComponent(MenuRenderComponent, { environmentInjector: this.cfg.injector, hostElement: mr });
    ref.setInput('menu', LANDING_MENU_CONTENT);
    ref.setInput('theme', theme);
    ref.changeDetectorRef.detectChanges();

    const km = q(el, '.ks-km');
    const s = km.style;
    s.setProperty('--ks-bg', theme.background);
    s.setProperty('--ks-text', theme.text);
    s.setProperty('--ks-surface', theme.surface);
    s.setProperty('--ks-border', theme.border);
    el.dataset['preset'] = id;

    const item = Array.from(mr.querySelectorAll<HTMLElement>('.item')).find(
      (li) => li.querySelector('.item-name')?.textContent?.trim() === UPDATED[0],
    );
    if (!item) throw new Error(`KartaScene : plat « ${UPDATED[0]} » introuvable`);
    q(item, '.item-price').innerHTML = `<span class="ks-pv"><span class="ks-pvi"><b>${UPDATED[1]}</b><b>${UPDATED[2]}</b></span></span>`;

    const raw: HTMLElement[][] = [[q(mr, '.eyebrow')], [q(mr, '.restaurant-name')]];
    mr.querySelectorAll<HTMLElement>('.category-name, .item').forEach((e) => {
      if (e.matches('.item')) raw.push(Array.from(e.children) as HTMLElement[]);
      else {
        const span = document.createElement('span');
        span.className = 'ks-tx';
        while (e.firstChild) span.appendChild(e.firstChild);
        e.appendChild(span);
        raw.push([span]);
      }
    });
    return {
      id,
      el,
      ref,
      mr,
      sheet: q(mr, '.sheet'),
      km,
      scroll: q(el, '.ks-kscroll'),
      sb: q(el, '.ks-sb'),
      ub: q(el, '.ks-ub'),
      home: q(el, '.ks-home'),
      fade: q(el, '.ks-fade'),
      groups: raw.map((els) => ({ els, h: 0, n: 0, on: true })),
      pvi: q(el, '.ks-pvi'),
      row: item,
      theme,
      state: '',
    };
  }

  /* ── Mesures (une fois) ───────────────────────────────────────────────── */

  private measure(): void {
    const scr = q(this.host, '.ks-screen').getBoundingClientRect();
    const k = scr.width / SCREEN.w;
    for (const L of this.layers.values()) {
      const cat2 = L.mr.querySelectorAll<HTMLElement>('.category')[1];
      this.scrollOf[L.id] = cat2.offsetTop - 50;
      for (const g of L.groups) {
        g.h = Math.max(...g.els.map((e) => e.offsetHeight)) + 2;
        // Position dans l'état défilé (là où le menu se trouve quand les styles changent).
        const top = (g.els[0].getBoundingClientRect().top - scr.top) / k - this.scrollOf[L.id];
        g.n = clamp((top - 50) / (SCREEN.h - 50 - 110));
        g.on = top < SCREEN.h && top + g.h > 0;
      }
    }
    this.revealDone = groupAt(this.layers.get('modern')!.groups.length - 1) + 0.6;
    this.lines = this.measureLines();
    this.rows = this.assignRows();
  }

  private measureLines(): Line[] {
    const M = this.layers.get('modern')!;
    const scr = q(this.host, '.ks-screen').getBoundingClientRect();
    const k = scr.width / SCREEN.w;
    const toRgb = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    const out: Line[] = [];
    const add = (el: HTMLElement, prop: string, r: DOMRect, h: number, color: number[]) => {
      const y = (r.bottom - scr.top) / k - h;
      if (y > 52 && y < SCREEN.h - 110)
        out.push({ el, prop, x: SCREEN.x + (r.left - scr.left) / k, y: SCREEN.y + y, w: r.width / k, h, color, land: 0 });
    };
    const rule = q(M.mr, '.header-rule');
    add(rule, 'backgroundColor', rule.getBoundingClientRect(), 3, toRgb(getComputedStyle(rule).backgroundColor));
    M.mr.querySelectorAll<HTMLElement>('.header, .category-name, .item:not(:last-child)').forEach((e) =>
      add(e, 'borderBottomColor', e.getBoundingClientRect(), 1, toRgb(getComputedStyle(e).borderBottomColor)),
    );
    return out;
  }

  private assignRows(): RowTarget[] {
    const L = this.lines;
    const total = L.reduce((s, l) => s + l.w, 0);
    const n = L.map((l) => Math.max(1, Math.round((25 * l.w) / total)));
    let diff = 25 - n.reduce((s, v) => s + v, 0);
    while (diff !== 0) {
      const i = n.indexOf(Math.max(...n));
      n[i] += Math.sign(diff);
      diff -= Math.sign(diff);
    }
    const rows: RowTarget[] = [];
    L.forEach((l, li) => {
      for (let j = 0; j < n[li]; j++) rows.push({ line: li, x: l.x + (j * l.w) / n[li], w: l.w / n[li] });
    });
    L.forEach((l, li) => {
      l.land = Math.max(...rows.map((r, ri) => (r.line === li ? rowStart(ri) + MORPH : 0)));
    });
    return rows;
  }

  /* ── Rendu ─────────────────────────────────────────────────────────────── */

  private scrollFor(t: number, id: LandingMenuPresetId): number {
    return t >= 10.9 ? 0 : this.scrollOf[id] * ease(prog(t, 5.5, 1.1));
  }

  /** Révélation d'un groupe : il monte derrière un masque collé à son propre bord bas. */
  private rise(g: Group, p: number): void {
    const dy = (1 - p) * g.h;
    const on = dy > 0.01;
    for (const e of g.els) {
      setStyle(e, 'transform', on ? `translateY(${dy.toFixed(2)}px)` : 'none');
      setStyle(e, 'clipPath', on ? `inset(0 0 ${dy.toFixed(2)}px 0)` : 'none');
      setStyle(e, 'opacity', p >= 1 ? '1' : clamp(p / 0.5).toFixed(3));
    }
  }

  /** Sortie : le groupe continue sa montée et se referme par le haut (même sens que le scroll). */
  private leave(g: Group, u: number): void {
    const dy = u * g.h;
    const on = dy > 0.01;
    for (const e of g.els) {
      setStyle(e, 'transform', on ? `translateY(${(-dy).toFixed(2)}px)` : 'none');
      setStyle(e, 'clipPath', on ? `inset(${dy.toFixed(2)}px 0 0 0)` : 'none');
      setStyle(e, 'opacity', (1 - u).toFixed(3));
    }
  }

  private renderLayer(L: Layer, t: number): void {
    setStyle(L.scroll, 'transform', `translateY(${-this.scrollFor(t, L.id).toFixed(2)}px)`);
    setStyle(L.pvi, 'transform', `translateY(${(-50 * ease(prog(t, 6.9, 0.35))).toFixed(2)}%)`);
    const fl = 0.14 * prog(t, 6.9, 0.15) * (1 - prog(t, 7.4, 0.7));
    const ac = rgb(L.theme.accent);
    const fc = `rgba(${ac[0]},${ac[1]},${ac[2]},${fl.toFixed(3)})`;
    setStyle(L.row, 'backgroundColor', fl > 0 ? fc : 'transparent');
    setStyle(L.row, 'boxShadow', fl > 0 ? `-10px 0 0 ${fc},10px 0 0 ${fc}` : 'none');
  }

  private setSteady(L: Layer): void {
    if (L.state === 'steady') return;
    L.state = 'steady';
    for (const g of L.groups) this.rise(g, 1);
  }

  private setTransparent(L: Layer, on: boolean): void {
    const v = on ? 'transparent' : '';
    setStyle(L.km, 'backgroundColor', v);
    setStyle(L.mr, 'backgroundColor', v);
    setStyle(L.sheet, 'backgroundColor', v);
    L.el.classList.toggle('ks-morphing', on);
  }

  /** Pose la scène à l'instant `t` (secondes). Idempotent et sans état accumulé. */
  seek(t: number): void {
    if (this.destroyed) return;
    t = clamp(t, 0, DURATION);
    const L = this.layout;
    const finalCard = L.finalCard;

    /* Caméra */
    const C = L.camera(t);
    setStyle(this.world, 'transform', `translate3d(${C.tx.toFixed(2)}px,${C.ty.toFixed(2)}px,0) scale(${C.s.toFixed(4)})`);

    /* Topographie : bandes superposées, opacité seule. Le motif est présent dès la première scène,
       puis ondule vers l'extérieur depuis le produit quand l'écran redevient QR. */
    const base = [0.9, 0.7, 0.46];
    const drift = ease(prog(t, 0, DURATION));
    setStyle(this.topoWrap, 'transform', `translate3d(0,${lerp(10, -10, drift).toFixed(2)}px,0) scale(${lerp(1.018, 1, drift).toFixed(4)})`);
    this.topoImgs.forEach((im, i) => {
      const o = lerp(base[i], 1, REV(prog(t, 10.7 + 0.32 * i, 1.0))) * ease(prog(t, 0, 0.8));
      setStyle(im, 'opacity', o.toFixed(3));
    });
    setStyle(this.grid, 'opacity', (0.6 * ease(prog(t, 0, 0.6)) * (1 - REV(prog(t, 10.1, 0.7)))).toFixed(3));

    const st = this.styleAt(t);
    const La = this.layers.get(st.a)!;
    const Lb = st.b ? this.layers.get(st.b)! : null;

    /* L'écran du style final se contracte en carré sur l'emplacement du QR, puis se résout en modules. */
    if (t < 10 || t >= 11.5) setStyle(this.flood, 'visibility', 'hidden');
    else {
      const p = expoIO(prog(t, 10.3, 0.7));
      const C2 = cardRect(finalCard);
      const m = 10 * finalCard.k;
      const Q: Rect = { x: C2.x + 30 * finalCard.k, y: C2.y + 30 * finalCard.k, w: 25 * m + 1, h: 25 * m + 1 };
      const R = lerpRect(SCREEN, Q, p);
      const cut = Math.round(25 * expoIO(prog(t, 11.0, 0.42))) * m * (R.h / Q.h);
      setStyle(this.flood, 'visibility', 'visible');
      setStyle(this.flood, 'backgroundColor', this.themes[st.a].background);
      setStyle(this.flood, 'zIndex', t >= 10.45 ? '2' : '');
      setStyle(this.flood, 'transform', `translate(${(R.x - SCREEN.x).toFixed(2)}px,${(R.y - SCREEN.y).toFixed(2)}px)`);
      setStyle(this.flood, 'width', R.w.toFixed(2) + 'px');
      setStyle(this.flood, 'height', R.h.toFixed(2) + 'px');
      setStyle(this.flood, 'borderRadius', lerp(48, 1, p).toFixed(2) + 'px');
      setStyle(this.flood, 'clipPath', cut > 0 ? `inset(${cut.toFixed(2)}px 0 0 0)` : 'none');
    }

    /* Carte de table → écran blanc du menu → carte finale */
    let cr: Rect | null = null;
    let rad = 14;
    let cop = 1;
    let capOp = 0;
    let k = 1;
    let shadow = true;
    if (t < 3.6) {
      const p = ease(prog(t, 0, 0.5));
      const R = cardRect(SCAN_CARD);
      const g = lerp(0.96, 1, p);
      cr = { x: R.x + (R.w * (1 - g)) / 2, y: R.y + (R.h * (1 - g)) / 2 + (1 - p) * 14, w: R.w * g, h: R.h * g };
      cop = p;
      capOp = ease(prog(t, 1.25, 0.4)) * (1 - prog(t, 3.5, 0.15));
    } else if (t < 4.95) {
      const p = expoIO(prog(t, 3.9, 0.6));
      cr = lerpRect(cardRect(SCAN_CARD), SCREEN, p);
      rad = lerp(14, 48, p);
      shadow = p < 0.5;
    } else if (t >= 10.9) {
      const p = REV(prog(t, 10.9, 0.6));
      const R = cardRect(finalCard);
      const g = lerp(0.9, 1, p);
      cr = { x: R.x + (R.w * (1 - g)) / 2, y: R.y + (R.h * (1 - g)) / 2, w: R.w * g, h: R.h * g };
      cop = ease(prog(t, 10.9, 0.3));
      rad = 16 * finalCard.k;
      k = finalCard.k;
      capOp = ease(prog(t, 11.45, 0.4));
    }
    if (!cr) setStyle(this.card, 'visibility', 'hidden');
    else {
      setStyle(this.card, 'visibility', 'visible');
      setStyle(this.card, 'transform', `translate(${cr.x.toFixed(2)}px,${cr.y.toFixed(2)}px)`);
      setStyle(this.card, 'width', cr.w.toFixed(2) + 'px');
      setStyle(this.card, 'height', cr.h.toFixed(2) + 'px');
      setStyle(this.card, 'borderRadius', rad.toFixed(2) + 'px');
      setStyle(this.card, 'opacity', cop.toFixed(3));
      setStyle(this.card, 'borderColor', shadow ? '#E6E6E4' : 'transparent');
      setStyle(this.card, 'boxShadow', shadow ? '' : 'none');
      setStyle(this.cap, 'opacity', capOp.toFixed(3));
      setStyle(this.cap, 'fontSize', 17 * k + 'px');
      setStyle(this.cap, 'bottom', 24 * k + 'px');
    }

    /* Téléphone — même trajectoire que la v1 ; pendant un changement de style il s'incline
       légèrement et respire : le mouvement du téléphone accompagne le changement de contenu. */
    const pf = L.phoneFinal;
    let ph: { op: number; dx: number; dy: number; k: number; ry: number; rx: number };
    if (t < 1.75) ph = { op: 0, dx: 0, dy: 760, k: 1, ry: 0, rx: 0 };
    else if (t < 10.15) {
      const r = easeIO(prog(t, 5.2, 1.0)) - easeIO(prog(t, 9.2, 0.7));
      ph = { op: ease(prog(t, 1.75, 0.3)), dx: 0, dy: lerp(760, 0, spring(prog(t, 1.75, 1.15))), k: 1, ry: 8 * r, rx: 2 * r };
    } else if (t < 10.9) {
      ph = { op: 1 - ease(prog(t, 10.1, 0.35)), dx: 0, dy: 0, k: 1, ry: 0, rx: 0 };
    } else {
      const p = spring(prog(t, 11.45, 1.15));
      ph = { op: ease(prog(t, 11.45, 0.35)), dx: lerp(pf.fromDx, pf.dx, p), dy: pf.dy, k: pf.k, ry: lerp(pf.ryFrom, pf.ry, p), rx: pf.rx };
    }
    if (Lb && t < 10.15) {
      // Bascule autour du centre du téléphone : sa position ne bouge pas (celle de A), seule sa pose respire.
      const w = Math.sin(Math.PI * st.q);
      ph.ry += 3.2 * w * (st.b === 'street_food' ? 1 : -1);
      ph.k *= 1 + 0.006 * w;
    }
    setStyle(this.phone, 'opacity', ph.op.toFixed(3));
    setStyle(this.phone, 'visibility', ph.op > 0 ? 'visible' : 'hidden');
    setStyle(
      this.phone,
      'transform',
      `translate(${ph.dx.toFixed(2)}px,${ph.dy.toFixed(2)}px) scale(${ph.k.toFixed(4)}) perspective(1800px) rotateY(${ph.ry.toFixed(3)}deg) rotateX(${ph.rx.toFixed(3)}deg)`,
    );

    /* Interface appareil photo */
    const camOp = ease(prog(t, 1.9, 0.4)) * (1 - ease(prog(t, 3.7, 0.3)));
    setStyle(this.cam, 'visibility', camOp > 0 ? 'visible' : 'hidden');
    setStyle(this.cam, 'opacity', camOp.toFixed(3));
    if (camOp > 0) {
      const H = { x: 40, y: 224, w: 310, h: 352 };
      setStyle(this.hole, 'left', H.x + 'px');
      setStyle(this.hole, 'top', H.y + 'px');
      setStyle(this.hole, 'width', H.w + 'px');
      setStyle(this.hole, 'height', H.h + 'px');
      const lock = ease(prog(t, 2.5, 0.55));
      const pulse = 1 + 0.04 * (1 - spring(prog(t, 3.0, 0.5))) * (t >= 3 ? 1 : 0);
      const big: Rect = { x: 18, y: 120, w: 354, h: 540 };
      const tight: Rect = { x: H.x - 12, y: H.y - 12, w: H.w + 24, h: H.h + 24 };
      const qr: Rect = { x: H.x + 30 - 8, y: H.y + 30 - 8, w: 250 + 16, h: 250 + 16 };
      let R = lerpRect(lerpRect(big, tight, lock), qr, expoIO(prog(t, 3.45, 0.3)));
      R = { x: R.x - (R.w * (pulse - 1)) / 2, y: R.y - (R.h * (pulse - 1)) / 2, w: R.w * pulse, h: R.h * pulse };
      const col = css(mixRgb([255, 255, 255], rgb('#F05A00'), ease(prog(t, 2.95, 0.15))));
      const pos = [
        [R.x, R.y],
        [R.x + R.w - 30, R.y],
        [R.x, R.y + R.h - 30],
        [R.x + R.w - 30, R.y + R.h - 30],
      ];
      this.brs.forEach((b, i) => {
        setStyle(b, 'transform', `translate(${pos[i][0].toFixed(2)}px,${pos[i][1].toFixed(2)}px)`);
        setStyle(b, 'color', col);
      });
      const pin = ease(prog(t, 3.05, 0.35));
      const press = 1 - 0.04 * Math.sin(Math.PI * prog(t, 3.45, 0.2));
      setStyle(this.pill, 'opacity', pin.toFixed(3));
      setStyle(this.pill, 'transform', `translate(-50%,${((1 - pin) * 10).toFixed(2)}px) scale(${press.toFixed(4)})`);
      const rp = prog(t, 3.5, 0.45);
      setStyle(this.ripple, 'opacity', (rp > 0 && rp < 1 ? 1 - rp : 0).toFixed(3));
      setStyle(this.ripple, 'transform', `scale(${(0.5 + 0.9 * ease(rp)).toFixed(3)})`);
    }

    /* Menu : seuls les calques utiles sont visibles et mis à jour */
    for (const Ly of this.layers.values()) {
      const active = Ly === La || Ly === Lb;
      setStyle(Ly.el, 'visibility', active ? 'visible' : 'hidden');
      if (!active) continue;
      setStyle(Ly.el, 'zIndex', Ly === Lb ? '2' : '1');
      this.renderLayer(Ly, t);
    }
    const bgNow = t < 4.95;

    if (Lb) {
      /* Changement de style : un FRONT descend dans le menu. Au-dessus du front, tout est déjà au
         nouveau style (fond, texte, filets) ; en dessous, encore à l'ancien ; seule une bande étroite
         est en transition. Les lignes y passent une à une : l'ancienne sort en montant, la nouvelle
         entre en montant, au moment précis où le front la croise. Pas de passage par un écran gris
         vide : on lit toujours un menu. */
      const qq = st.q;
      const H = SCREEN.h;
      const front = clamp(((qq - 0.24) / 0.52) * H, 0, H);
      const band = 150;
      const pct = (px: number) => ((px / H) * 100).toFixed(2);
      this.setTransparent(La, true);
      this.setTransparent(Lb, true);
      setStyle(
        this.screenBg,
        'background',
        qq <= 0
          ? La.theme.background
          : `linear-gradient(to bottom,${Lb.theme.background} 0,${Lb.theme.background} ${pct(front - band / 2)}%,${La.theme.background} ${pct(front + band / 2)}%,${La.theme.background} 100%)`,
      );
      setStyle(La.el, 'opacity', '1');
      setStyle(Lb.el, 'opacity', '1');
      setStyle(La.el, 'clipPath', `inset(${front.toFixed(1)}px 0 0 0)`);
      setStyle(Lb.el, 'clipPath', `inset(0 0 ${(H - front).toFixed(1)}px 0)`);
      La.state = Lb.state = 'morph';
      // Hors écran, rien à voir : ces groupes sont posés une fois dans leur état final (aucune écriture ensuite).
      // T(n) : instant où le front croise la ligne n. L'ancienne sort juste avant (elle reste lisible jusque-là),
      // la nouvelle entre juste après.
      for (const g of La.groups) this.leave(g, g.on ? EIO(prog(qq, 0.3 + 0.4 * g.n - 0.12, 0.12)) : 1);
      for (const g of Lb.groups) this.rise(g, g.on ? REV(prog(qq, 0.3 + 0.4 * g.n, 0.3)) : 1);
    } else {
      this.setTransparent(La, bgNow);
      setStyle(La.el, 'opacity', '1');
      setStyle(La.el, 'clipPath', 'none');
      setStyle(this.screenBg, 'background', bgNow ? 'transparent' : La.theme.background);
      if (La.id === 'modern' && t < this.revealDone) {
        La.state = 'reveal';
        La.groups.forEach((g, j) => this.rise(g, REV(prog(t, groupAt(j), 0.55))));
      } else if (t >= 10 && t < 10.9) {
        La.state = 'leave';
        La.groups.forEach((g, j) => this.leave(g, EIO(prog(t, groupHideAt(j), 0.28))));
      } else this.setSteady(La);
    }

    const lineOn = t >= 5.45;
    const M = this.layers.get('modern')!;
    for (const l of this.lines) setStyle(l.el, l.prop, lineOn || t >= l.land ? '' : 'transparent');
    const chrome = t < 10 ? REV(prog(t, 4.42, 0.45)) : 1;
    for (const e of [M.sb, M.ub, M.fade]) setStyle(e, 'opacity', chrome.toFixed(3));
    setStyle(M.ub, 'transform', `translateY(${((1 - chrome) * 10).toFixed(2)}px)`);
    setStyle(M.home, 'opacity', t < 4.3 ? '0' : '1');

    /* Modules du QR */
    const showMods = t < 5.45 || t >= 10.98;
    setStyle(this.modulesEl, 'visibility', showMods ? 'visible' : 'hidden');
    if (showMods) {
      const mm = 10 * SCAN_CARD.k;
      const left = cardRect(SCAN_CARD).x + 30 * SCAN_CARD.k;
      for (const m of this.modules) {
        let R: Rect;
        let col: number[] = [19, 19, 18];
        let op = 1;
        if (t < 3.62) {
          const g = spring(prog(t, m.enter, 0.5));
          const c = qrCell(SCAN_CARD, m.r, m.c);
          R = { x: c.x + (c.w * (1 - g)) / 2, y: c.y + (c.h * (1 - g)) / 2, w: c.w * g, h: c.h * g };
          op = g > 0 ? 1 : 0;
        } else if (t < 10) {
          const c = qrCell(SCAN_CARD, m.r, m.c);
          const n = this.rowCount[m.r];
          const sq = REV(prog(t, 3.62, 0.25));
          const hh = lerp(c.h, mm * 0.5, sq);
          const pk = expoIO(prog(t, 3.78 + 0.006 * m.r, 0.32));
          const packed: Rect = { x: lerp(c.x, left + m.k * mm, pk), y: c.y + (c.h - hh) / 2, w: c.w, h: hh };
          const row = this.rows[m.r];
          const Ln = this.lines[row.line];
          const sw = row.w / n;
          const target: Rect = { x: row.x + m.k * sw, y: Ln.y, w: sw + 0.6, h: Ln.h };
          const mv = expoIO(prog(t, rowStart(m.r), MORPH));
          R = lerpRect(packed, target, mv);
          col = mixRgb(col, Ln.color, mv);
          op = t >= Ln.land ? 0 : 1;
        } else {
          R = qrCell(finalCard, m.r, m.c);
        }
        setStyle(m.el, 'opacity', op.toFixed(3));
        if (op > 0) {
          setStyle(m.el, 'transform', `translate(${R.x.toFixed(2)}px,${R.y.toFixed(2)}px) scale(${(R.w / 100).toFixed(4)},${(R.h / 100).toFixed(4)})`);
          setStyle(m.el, 'background', css(col));
        }
      }
    }

    /* Viseur final autour du QR */
    const fb = ease(prog(t, 11.55, 0.6));
    setStyle(this.fbr, 'visibility', fb > 0 ? 'visible' : 'hidden');
    if (fb > 0) {
      const R = cardRect(finalCard);
      const pad = lerp(70, 18, fb);
      setStyle(this.fbr, 'transform', `translate(${R.x - pad}px,${R.y - pad}px)`);
      setStyle(this.fbr, 'width', R.w + 2 * pad + 'px');
      setStyle(this.fbr, 'height', R.h + 2 * pad + 'px');
      setStyle(this.fbr, 'opacity', fb.toFixed(3));
    }
  }
}
