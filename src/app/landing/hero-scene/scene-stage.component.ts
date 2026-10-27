import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EnvironmentInjector,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  inject,
  output,
  signal,
} from '@angular/core';
import { LandingMenuPresetId } from '../landing-menu-presets';
import { KartaScene } from './karta-scene';
import { SceneLayout, makeLayout } from './scene-layouts';
import { clamp } from './scene-math';
import { SCENE_CSS } from './scene-styles';
import { TextTimeline } from './text-timeline';

/** Bandes topographiques (intérieure → extérieure), une série par gabarit — voir `public/hero/topo2`. */
const topoUrls = (kind: 'wide' | 'tall'): [string, string, string] => [
  `/hero/topo2/topo-${kind}-0.svg`,
  `/hero/topo2/topo-${kind}-1.svg`,
  `/hero/topo2/topo-${kind}-2.svg`,
];

/**
 * Cadre de la scène cinématique du hero : choisit le gabarit (`wide` 1920×1080 ou `tall`
 * portrait mobile), met l'ensemble à l'échelle de son conteneur, héberge la {@link KartaScene}
 * et fait vivre le texte projeté (`[ksUnder]` derrière la scène, `[ksOver]` devant).
 *
 * Le contenu projeté est dessiné dans le repère du cadre (1920×1080 ou 480×H) et suit donc la
 * mise à l'échelle : un lien reste un vrai lien, une taille reste proportionnelle. Le hero ne
 * connaît que `seek(t)` ; le reste est interne.
 *
 * Rendu serveur (prérendu) : seul le contenu projeté est rendu ; la scène se construit côté
 * navigateur (`afterNextRender`).
 */
@Component({
  selector: 'ks-stage',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ks-tall]': "kind() === 'tall'",
    '[class.ks-wide]': "kind() === 'wide'",
    '[class.ks-short]': 'short()',
  },
  template: `
    <div class="ks-stage" #stage>
      <div class="ks-under"><ng-content select="[ksUnder]" /></div>
      <div class="ks-scene" #scene aria-hidden="true"></div>
      <div class="ks-over"><ng-content select="[ksOver]" /></div>
    </div>
  `,
  styles: SCENE_CSS,
})
export class SceneStageComponent implements OnDestroy {
  /** Émis après chaque (re)construction de la scène (premier rendu, changement de gabarit). */
  readonly ready = output<void>();

  readonly kind = signal<'wide' | 'tall'>('wide');
  /** Portrait court (cadre < 940 px de haut) : le hero peut masquer un texte secondaire. */
  readonly short = signal(false);
  /** Vrai dès que la scène est construite (polices chargées, menu mesuré). */
  isReady = false;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(EnvironmentInjector);
  private scene: KartaScene | null = null;
  private text: TextTimeline | null = null;
  private resize: ResizeObserver | null = null;
  private layoutKey = '';
  private t = 0;
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      void this.boot();
    });
  }

  /** Pose la scène et le texte à l'instant `t` (secondes, 0 → 14). */
  seek(t: number): void {
    this.t = t;
    this.scene?.seek(t);
    this.text?.update(t);
  }

  shownPreset(t = this.t): LandingMenuPresetId {
    return this.scene?.shownPreset(t) ?? 'modern';
  }

  /** Accent du style montré, interpolé pendant la transition. */
  accentAt(t = this.t): string {
    return this.scene?.accentAt(t) ?? '#F05A00';
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resize?.disconnect();
    this.scene?.destroy();
    this.scene = null;
  }

  private async boot(): Promise<void> {
    // Le menu et le texte sont mesurés : on attend les polices avant de construire.
    try {
      await document.fonts?.ready;
    } catch {
      /* polices indisponibles : on construit quand même */
    }
    if (this.destroyed) return;
    this.text = new TextTimeline(this.host);
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(this.host);
    this.fit();
  }

  private fit(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h || this.destroyed) return;
    const kind: 'wide' | 'tall' = w < 820 || h > w * 1.1 ? 'tall' : 'wide';
    const W = kind === 'wide' ? 1920 : 480;
    const H = kind === 'wide' ? 1080 : clamp(Math.round((480 * h) / w), 760, 1040);
    const k = Math.min(w / W, h / H);
    const stage = this.host.querySelector<HTMLElement>('.ks-stage');
    if (!stage) return;
    stage.style.setProperty('--ks-k', k.toFixed(4));
    // Cadre plus étroit que l'écran (tablette portrait) : les bords s'effacent au lieu d'être coupés net.
    this.host.classList.toggle('ks-box', w - W * k > 2);
    stage.style.width = `${W}px`;
    stage.style.height = `${H}px`;
    stage.style.transform = `translate(${((w - W * k) / 2).toFixed(2)}px,${((h - H * k) / 2).toFixed(2)}px) scale(${k.toFixed(5)})`;

    const key = `${kind}:${H}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.kind.set(kind);
    this.short.set(kind === 'tall' && H < 940);
    // Les classes d'hôte (`ks-tall`) doivent être posées avant de mesurer le menu.
    this.host.classList.toggle('ks-tall', kind === 'tall');
    this.host.classList.toggle('ks-wide', kind === 'wide');
    this.rebuild(makeLayout(kind, W, H));
  }

  private rebuild(layout: SceneLayout): void {
    const mount = this.host.querySelector<HTMLElement>('.ks-scene');
    if (!mount) return;
    this.scene?.destroy();
    this.scene = KartaScene.create(mount, { layout, injector: this.injector, topoUrls: topoUrls(layout.kind) });
    this.scene.seek(this.t);
    this.text?.update(this.t);
    this.isReady = true;
    this.ready.emit();
  }
}
