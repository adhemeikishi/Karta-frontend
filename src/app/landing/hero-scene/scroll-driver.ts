import { clamp, ease, lerp } from './scene-math';

/** Paires [progression de scroll 0→1, instant de la scène en secondes], croissantes. Deux repères au même `t` forment un palier. */
export type KeyMap = readonly (readonly [number, number])[];

/**
 * scroll → timeline. Choix techniques, et la cause corrigée par chacun :
 *
 *  - `pchipMap` : interpolation monotone cubique (Fritsch–Butland). Une interpolation
 *    linéaire entre repères fait sauter la vitesse de la scène à chaque repère (0 → 20 s
 *    de film par unité de progression à la sortie d'un palier) — un à-coup que le lissage
 *    ne fait que flouter. Ici la vitesse est continue, les paliers s'ouvrent et se ferment
 *    en douceur, et la fonction reste strictement monotone : jamais de retour en arrière.
 *  - la progression se calcule depuis `scrollY` et une géométrie mesurée une fois
 *    (ResizeObserver) : plus de `getBoundingClientRect` à chaque scroll, donc plus de
 *    recalcul de layout forcé juste après les écritures de style de l'image précédente.
 *  - filtre critique d'ordre 2 en forme exacte (stable quel que soit `dt`) plutôt qu'un lissage
 *    exponentiel : vitesse continue même quand la cible change brusquement. Retard ≈ 2/ω ≈ 75 ms ;
 *    sa raideur peut rester haute parce que les vraies causes de saccade (voir `karta-scene.ts`)
 *    ont été traitées à la source.
 *  - au toucher, le défilement natif est déjà inertiel : le filtre est quasi transparent.
 */

/** Interpolation monotone cubique de Hermite ; pente nulle aux deux extrémités. */
export function pchipMap(keys: KeyMap): (p: number) => number {
  const n = keys.length;
  const x = keys.map((k) => k[0]);
  const y = keys.map((k) => k[1]);
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(x[i + 1] - x[i]);
    d.push((y[i + 1] - y[i]) / h[i]);
  }
  const m: number[] = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (p) => {
    if (p <= x[0]) return y[0];
    if (p >= x[n - 1]) return y[n - 1];
    let i = 0;
    while (p > x[i + 1]) i++;
    const s = (p - x[i]) / h[i];
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h[i] * m[i + 1]
    );
  };
}

export interface DriverOptions {
  pin: HTMLElement;
  sticky: HTMLElement;
  map: (p: number) => number;
  apply: (t: number, p: number) => void;
  intro?: { from: number; dur: number };
  instant?: boolean;
  /** Raideur du filtre au pointeur (molette / trackpad). */
  omega?: number;
  /** Raideur au toucher. */
  omegaTouch?: number;
}

export class ScrollDriver {
  private t = 0;
  private v = 0;
  private target = 0;
  private p = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private touch = false;
  private pinTop = 0;
  private len = 1;
  private ro: ResizeObserver | null = null;
  private intro = false;
  private introFrom = 0;
  private introTo = 0;
  private introDur = 1;
  private introStart = 0;
  private lastApplied = NaN;

  constructor(private readonly o: DriverOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.measure();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('touchstart', this.onTouch, { passive: true });
    window.addEventListener('wheel', this.onWheel, { passive: true });
    this.ro = new ResizeObserver(() => this.refresh());
    this.ro.observe(this.o.pin);
    this.ro.observe(this.o.sticky);
    this.p = this.progress();
    this.target = this.o.map(this.p);
    const o = this.o;
    if (o.intro && !o.instant && window.scrollY < 8 && this.p < 0.002) {
      this.intro = true;
      this.introFrom = o.intro.from;
      this.introTo = this.target;
      this.introDur = o.intro.dur;
      this.introStart = performance.now();
      this.t = this.introFrom;
    } else this.t = this.target;
    this.emit();
    this.schedule();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('touchstart', this.onTouch);
    window.removeEventListener('wheel', this.onWheel);
    this.ro?.disconnect();
    this.ro = null;
  }

  /** Géométrie du scroll, mesurée une fois (et à chaque redimensionnement). */
  private measure(): void {
    this.pinTop = this.o.pin.getBoundingClientRect().top + window.scrollY;
    this.len = Math.max(1, this.o.pin.offsetHeight - this.o.sticky.offsetHeight);
  }

  refresh(): void {
    this.measure();
    this.onScroll();
  }

  /** Progression 0 → 1, depuis `scrollY` seul : aucune lecture de layout. */
  private progress(): number {
    return clamp((window.scrollY - this.pinTop) / this.len);
  }

  private readonly onTouch = (): void => {
    this.touch = true;
  };
  private readonly onWheel = (): void => {
    this.touch = false;
  };

  private readonly onScroll = (): void => {
    this.p = this.progress();
    this.target = this.o.map(this.p);
    if (this.intro && this.p > 0.002) this.intro = false;
    this.schedule();
  };

  private schedule(): void {
    if (!this.raf && this.running) this.raf = requestAnimationFrame(this.frame);
  }

  private emit(): void {
    if (Math.abs(this.t - this.lastApplied) < 1e-5) return;
    this.lastApplied = this.t;
    this.o.apply(this.t, this.p);
  }

  private readonly frame = (now: number): void => {
    this.raf = 0;
    if (!this.running) return;
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 1 / 60);
    this.last = now;
    let moving = false;
    if (this.intro) {
      const k = clamp((now - this.introStart) / this.introDur);
      this.t = lerp(this.introFrom, this.introTo, ease(k));
      this.v = 0;
      if (k >= 1) this.intro = false;
      else moving = true;
    } else if (this.o.instant) {
      this.t = this.target;
    } else {
      // Filtre critique d'ordre 2, solution exacte sur [0, dt] pour une cible constante.
      const w = this.touch ? (this.o.omegaTouch ?? 42) : (this.o.omega ?? 26);
      const e = this.t - this.target;
      const ex = Math.exp(-w * dt);
      const c = this.v + w * e;
      const ne = (e + c * dt) * ex;
      this.v = (this.v - w * c * dt) * ex;
      this.t = this.target + ne;
      if (Math.abs(ne) < 4e-4 && Math.abs(this.v) < 4e-3) {
        this.t = this.target;
        this.v = 0;
      } else moving = true;
    }
    this.emit();
    if (moving) this.raf = requestAnimationFrame(this.frame);
    else this.last = 0;
  };
}
