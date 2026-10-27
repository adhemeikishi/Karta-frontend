import { Component, ElementRef, ViewEncapsulation, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { scrollToAnchor } from '../scroll-to-anchor';
import { COMMON_CSS } from '../hero-scene/hero-scene-common';
import { SceneStageComponent } from '../hero-scene/scene-stage.component';
import { useScrollScene } from '../hero-scene/use-scroll-scene';

/**
 * Hero de la landing Karta — scène cinématique pilotée par le scroll.
 *
 * Composition typographique affirmée : très grandes capitales (le titre « Votre carte / Changez-la /
 * Pas le QR »), un plan macro sur les modules du QR qui recule, puis un téléphone qui affiche le vrai
 * menu public Karta (`MenuRenderComponent`) : le QR devient le menu, un prix change sans changer le QR,
 * trois styles réels défilent, puis le menu redevient le QR. Le scroll fait avancer la chronologie de
 * 14 s (`ScrollDriver`) ; remonter la rejoue à l'envers ; `prefers-reduced-motion` fige la
 * composition finale.
 *
 * Le langage cartographique de Karta (numéros de chapitre en contour, repères d'enregistrement,
 * topographie en anneaux autour du produit) en est la signature. Gabarit portrait dédié sur mobile.
 *
 * Accessibilité et SEO : le titre de la page (`h1`) et son chapeau sont toujours présents dans le DOM
 * (`sr-only`), y compris au prérendu ; le texte animé est un habillage visuel de la scène.
 */
@Component({
  selector: 'landing-hero',
  imports: [SceneStageComponent, RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section #pin class="kv-pin kvs" [class.kv-reduced]="reduced()" style="--kv-len-wide:6.5;--kv-len-tall:4.6">
      <!-- Titre de la page et chapeau : toujours dans le DOM (prérendu, lecteurs d'écran, moteurs de recherche). -->
      <div class="sr-only">
        <h1>Votre carte. Changez-la. Pas le QR.</h1>
        <p>Un menu digital toujours accessible à vos clients. Vous modifiez les plats et les prix, jamais le QR.</p>
      </div>
      <div #sticky class="kv-sticky">
        <ks-stage #stage>
          <!-- Derrière la scène : numéros de chapitre en contour, repères d'enregistrement -->
          <div ksUnder>
            <i class="kvs-mark" style="left:90px;top:96px"></i>
            <i class="kvs-mark" style="left:1830px;top:96px"></i>
            <i class="kvs-mark" style="left:90px;top:986px"></i>
            <i class="kvs-mark" style="left:1830px;top:986px"></i>
            <div class="ks-blk kvs-num" data-in="2.3" data-out="3.5" data-rise="22"><span class="ks-ln"><span>01</span></span></div>
            <div class="ks-blk kvs-num" data-in="4.7" data-out="7.5" data-rise="22"><span class="ks-ln"><span>02</span></span></div>
            <div class="ks-blk kvs-num" data-in="7.9" data-out="10.0" data-rise="22"><span class="ks-ln"><span>03</span></span></div>
          </div>
          <div ksOver>
            <!-- Ouverture : le titre actuel du hero, très grand -->
            <div class="ks-blk kvs-intro" data-in="0.6" data-out="1.72" data-stagger="0.1">
              <p class="kvs-h1">
                <span class="ks-ln"><span>Votre carte</span></span>
                <span class="ks-ln kvs-i1"><span>Changez-la</span></span>
                <span class="ks-ln kvs-i2"><span>Pas le QR</span></span>
              </p>
              <p class="kvs-lead ks-ln" aria-hidden="true">
                <span>Un menu digital toujours accessible à vos clients. Vous modifiez les plats et les prix, jamais le QR.</span>
              </p>
              <div class="kvs-ctas ks-ln">
                <div>
                  <a routerLink="/login" class="kv-btn kv-btn-primary">Importer mon menu</a>
                  <a href="#menu" (click)="scrollToAnchor('menu', $event)" class="kv-btn kv-btn-ghost kvs-ghost">Voir comment ça marche</a>
                </div>
              </div>
            </div>

            <!-- 01 · Le scan -->
            <div class="ks-blk kvs-eb" data-in="2.3" data-out="3.5"><span class="ks-ln"><span>01 · Le scan</span></span></div>
            <div class="ks-blk kvs-h2" data-in="2.4" data-out="3.45">
              <h2><span class="ks-ln"><span>Un scan,</span></span><span class="ks-ln"><span>et la carte</span></span><span class="ks-ln"><span>s’ouvre.</span></span></h2>
              <p class="ks-ln"><span>Le client vise le QR de sa table avec l’appareil photo de son téléphone.</span></p>
            </div>
            <!-- 02 · La carte -->
            <div class="ks-blk kvs-eb" data-in="4.6" data-out="7.5"><span class="ks-ln"><span>02 · La carte</span></span></div>
            <div class="ks-blk kvs-h2" data-in="4.7" data-out="6.2" data-stagger="0.09">
              <h2><span class="ks-ln"><span>Votre menu,</span></span><span class="ks-ln"><span>sur son</span></span><span class="ks-ln"><span>téléphone.</span></span></h2>
              <p class="ks-ln"><span>Aucune application à installer. Le client parcourt la carte comme une page web.</span></p>
            </div>
            <div class="ks-blk kvs-h2 kvs-prix" data-in="6.55" data-out="7.5">
              <h2><span class="ks-ln"><span>Les prix</span></span><span class="ks-ln"><span>changent.</span></span><span class="ks-ln"><span>Le QR, jamais.</span></span></h2>
              <p class="ks-ln"><span>Modifiez un plat, publiez : la carte est à jour au prochain scan.</span></p>
            </div>
            <!-- 03 · Votre style -->
            <div class="ks-blk kvs-eb" data-in="7.95" data-out="10.0"><span class="ks-ln"><span>03 · Votre style</span></span></div>
            <div class="ks-blk kvs-h2" data-in="8.0" data-out="10.0">
              <h2><span class="ks-ln"><span>Une carte,</span></span><span class="ks-ln"><span>à votre</span></span><span class="ks-ln"><span>image.</span></span></h2>
              <p class="kvs-styles ks-ln">
                <span>@for (s of styles; track s.id) {<b class="kvs-st" [attr.data-preset]="s.id">{{ s.label }}</b>}</span>
              </p>
            </div>

            <!-- Composition finale -->
            <div class="ks-blk kvs-final" data-in="12.0" data-stagger="0.1">
              <h2 class="kvs-head">
                <span class="ks-ln"><span>Votre carte,</span></span>
                <span class="ks-ln kvs-f1"><span>en version</span></span>
                <span class="ks-ln kvs-f2"><span>digitale.</span></span>
              </h2>
              <p class="kvs-sub ks-ln"><span>Un menu personnalisé, accessible en un scan.<br />Vous changez les plats et les prix, jamais le QR.</span></p>
              <div class="kvs-cta ks-ln">
                <a routerLink="/login" class="kv-btn kv-btn-primary">Importer mon menu
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" /></svg>
                </a>
              </div>
            </div>

          </div>
        </ks-stage>
        <a #skip class="kv-skip" href="#menu" (click)="scrollToAnchor('menu', $event)">Passer l’animation ↓</a>
      </div>
    </section>

  `,
  styles: [
    COMMON_CSS,
    `
    /* ── Variante C : très grandes capitales, grilles, repères cartographiques ── */
    .kvs{background:var(--k-canvas,#FAFAF8)}
    .kvs .kvs-intro{left:90px;top:236px;width:900px}
    .kvs .kvs-h1,.kvs .kvs-head{margin:0;font-weight:800;line-height:.9;letter-spacing:-.05em;text-transform:uppercase;color:var(--k-ink-900,#131312)}
    .kvs .kvs-h1{font-size:110px}
    .kvs .kvs-h1 .ks-ln,.kvs .kvs-head .ks-ln,.kvs .kvs-h2 h2 .ks-ln{white-space:nowrap}
    .kvs .kvs-i1{padding-left:56px}
    .kvs .kvs-i2{padding-left:112px}
    .kvs .kvs-f1{padding-left:56px}
    .kvs .kvs-f2{padding-left:112px}
    .kvs .kvs-lead{margin:40px 0 0;font-size:22px;line-height:1.55;color:var(--k-ink-500,#6B6A64);max-width:600px}
    .kvs .kvs-lead>span{display:block}
    .kvs .kvs-ctas{margin-top:34px}
    .kvs .kvs-ctas>div{display:flex;gap:12px}

    .kvs .kvs-eb{left:90px;top:262px;font:600 14px/1 var(--k-font-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--k-persimmon,#F05A00)}
    .kvs .kvs-h2{left:90px;top:300px;width:880px}
    .kvs .kvs-h2 h2{margin:0;font-size:96px;line-height:.92;font-weight:800;letter-spacing:-.05em;text-transform:uppercase;color:var(--k-ink-900,#131312)}
    .kvs .kvs-prix h2{font-size:88px}
    .kvs .kvs-h2 p{margin:34px 0 0;font-size:21px;line-height:1.5;color:var(--k-ink-500,#6B6A64);max-width:520px}
    .kvs .kvs-h2 p>span{display:block}
    .kvs .kvs-styles{margin:34px 0 0}
    .kvs .kvs-styles>span{display:block;max-width:720px}
    .kvs .kvs-st{display:inline-block;margin:0 22px 8px 0;font:600 14px/1 var(--k-font-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--k-ink-400,#8C8B84);padding-bottom:6px;border-bottom:2px solid transparent}
    .kvs .kvs-st.is-on{color:var(--k-ink-900,#131312)}

    .kvs .kvs-num{left:60px;top:560px;font-size:420px;font-weight:800;line-height:.8;letter-spacing:-.07em;color:transparent;-webkit-text-stroke:1.5px var(--k-ink-200,#DBDAD5)}
    .kvs .kvs-mark{position:absolute;width:19px;height:19px;margin:-9px 0 0 -9px;opacity:.9;
      background:linear-gradient(var(--k-ink-300,#B6B5AE),var(--k-ink-300,#B6B5AE)) center/1px 100% no-repeat,linear-gradient(var(--k-ink-300,#B6B5AE),var(--k-ink-300,#B6B5AE)) center/100% 1px no-repeat}

    .kvs .kvs-final{left:90px;top:236px;width:900px}
    .kvs .kvs-head{font-size:104px}
    .kvs .kvs-sub{margin:44px 0 0;font-size:22px;line-height:1.55;color:var(--k-ink-500,#6B6A64);width:620px}
    .kvs .kvs-sub>span{display:block}
    .kvs .kvs-cta{margin-top:36px}

    /* Lien « passer » : sur mobile une vraie commande (fond plein, 44 px), jamais du texte posé sur le menu. */
    @media (max-width:819px),(max-aspect-ratio:11/10){
      .kvs .kv-skip{white-space:nowrap;font-size:10px;letter-spacing:.1em;right:50%;transform:translateX(50%);bottom:max(14px,env(safe-area-inset-bottom));min-height:44px;display:inline-flex;align-items:center;padding:0 18px;border-radius:999px;
        background:var(--k-white,#fff);color:var(--k-ink-700,#3B3A37);box-shadow:0 0 0 1px var(--k-hairline,#E6E6E4),0 6px 18px -8px rgba(19,19,18,.25);transition:opacity .25s var(--k-ease,ease)}
      .kvs .kv-skip.is-done{opacity:0;pointer-events:none}
    }

    /* ── Mobile : composition pensée pour 390 px, pas une réduction du desktop.
          Le haut du texte suit la navbar (hauteur fixe en px écran) : top = max(96, 90 px écran / échelle du cadre).
          Le téléphone occupe ~83 % de la largeur et sort par le bas ; règle et numéros laissent la place au produit. */
    .ks-tall .kvs-mark,.ks-tall .kvs-num{display:none}
    .ks-tall .kvs-intro{left:36px;top:max(96px,calc(90px / var(--ks-k,1)));width:420px}
    .ks-tall .kvs-h1{font-size:54px}
    .ks-tall .kvs-i1{padding-left:28px}
    .ks-tall .kvs-i2{padding-left:56px}
    .ks-tall .kvs-eb{left:36px;top:max(96px,calc(90px / var(--ks-k,1)));font-size:11px}
    .ks-tall .kvs-h2{left:36px;top:max(120px,calc(90px / var(--ks-k,1) + 24px));width:410px}
    .ks-tall .kvs-h2 h2{font-size:46px}
    .ks-tall .kvs-prix h2{font-size:42px}
    .ks-tall .kvs-lead,.ks-tall .kvs-h2 p{margin-top:14px;font-size:15px;max-width:400px}
    .ks-tall.ks-short .kvs-lead,.ks-tall.ks-short .kvs-h2 p{display:none}
    .ks-tall .kvs-ctas{margin-top:16px}
    .ks-tall .kvs-ghost{display:none}
    /* Zones tactiles : 56 px de conception (≈ 45 px à 390 de large) + 8 px de zone de frappe invisible. */
    .ks-tall .kv-btn{position:relative;height:56px;font-size:17px;padding:0 22px}
    .ks-tall .kv-btn::after{content:'';position:absolute;inset:-8px}
    .ks-tall .kvs-styles{margin-top:16px}
    .ks-tall .kvs-st{font-size:11px;margin-right:14px}
    .ks-tall .kvs-final{left:36px;top:max(96px,calc(90px / var(--ks-k,1)));width:420px}
    .ks-tall .kvs-head{font-size:46px}
    .ks-tall .kvs-f1{padding-left:24px}
    .ks-tall .kvs-f2{padding-left:48px}
    .ks-tall .kvs-sub{margin-top:16px;font-size:14.5px;width:408px}
    .ks-tall .kvs-cta{margin-top:18px}

    `,
  ],
})
export class HeroComponent {
  private readonly pin = viewChild.required<ElementRef<HTMLElement>>('pin');
  private readonly sticky = viewChild.required<ElementRef<HTMLElement>>('sticky');
  private readonly stage = viewChild.required<SceneStageComponent>('stage');
  private readonly stageEl = viewChild.required<SceneStageComponent, ElementRef<HTMLElement>>('stage', { read: ElementRef });
  private readonly skip = viewChild.required<ElementRef<HTMLElement>>('skip');

  protected readonly scrollToAnchor = scrollToAnchor;
  protected readonly styles = [
    { id: 'modern', label: 'Modern' },
    { id: 'dark', label: 'Dark' },
    { id: 'street_food', label: 'Street Food' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'luxe', label: 'Luxe' },
  ] as const;
  private styleEls: HTMLElement[] | null = null;
  private accentEls: HTMLElement[] | null = null;
  private lastShown = '';

  protected readonly reduced = useScrollScene({
    pin: () => this.pin().nativeElement,
    sticky: () => this.sticky().nativeElement,
    stage: () => this.stage(),
    // Repères [progression, t]. Les paliers (t constant) laissent lire : le QR, le scan, le menu, le
    // prix, puis chaque style une fois posé. L'interpolation monotone les ouvre et les ferme en douceur.
    wide: [
      [0, 1.7], [0.02, 1.7],
      [0.11, 3.3], [0.15, 3.3],
      [0.27, 5.5], [0.31, 5.5],
      [0.39, 6.95], [0.43, 7.25], [0.47, 7.25],
      [0.5, 7.95], [0.6, 8.95], [0.64, 8.95],
      [0.73, 9.9], [0.77, 9.9],
      [0.88, 11.9], [0.95, 13.9], [1, 13.99],
    ],
    tall: [
      [0, 1.7], [0.03, 1.7],
      [0.12, 3.3], [0.17, 3.3],
      [0.3, 5.5], [0.34, 5.5],
      [0.41, 6.95], [0.45, 7.25], [0.49, 7.25],
      [0.52, 7.95], [0.62, 8.95], [0.66, 8.95],
      [0.75, 9.9], [0.79, 9.9],
      [0.89, 11.9], [0.95, 13.9], [1, 13.99],
    ],
    intro: { from: 0, dur: 2400 },
    extra: (t, p) => {
      const stage = this.stage();
      this.skip().nativeElement.classList.toggle('is-done', p > 0.94);
      // Teinte d'accent du style montré, écrite directement sur la dizaine d'éléments concernés : poser une
      // variable CSS sur un ancêtre (héritée) recalculait le style de ~3 000 éléments à chaque image.
      const accent = stage.accentAt(t);
      const root = this.stageEl().nativeElement;
      this.styleEls ??= Array.from(root.querySelectorAll<HTMLElement>('.kvs-st'));
      this.accentEls ??= Array.from(root.querySelectorAll<HTMLElement>('.kvs-eb'));
      if (accent !== this.lastShown) {
        this.lastShown = accent;
        for (const el of this.accentEls) el.style.color = accent;
        for (const el of this.styleEls) el.style.borderBottomColor = el.classList.contains('is-on') ? accent : 'transparent';
      }
      const shown = stage.shownPreset(t);
      for (const el of this.styleEls) {
        const on = el.dataset['preset'] === shown;
        if (el.classList.contains('is-on') !== on) {
          el.classList.toggle('is-on', on);
          el.style.borderBottomColor = on ? accent : 'transparent';
        }
      }
    },
  }).reduced;
}
