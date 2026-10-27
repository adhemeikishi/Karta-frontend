/**
 * Maths d'animation de la scène cinématique — portées 1:1 de
 * `motion-concepts/karta-hero/index.html` (easings, ressort, mélange de couleurs).
 * Fonctions pures : aucune dépendance au DOM ni à l'état précédent.
 */

export type Rgb = [number, number, number];
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;
/** Progression 0→1 de `t` sur la fenêtre [t0, t0 + d]. */
export const prog = (t: number, t0: number, d: number): number => clamp((t - t0) / d);

/** Courbe de Bézier cubique CSS `cubic-bezier(x1,y1,x2,y2)`, résolue par bissection. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const X = (s: number) => ((ax * s + bx) * s + cx) * s;
  const Y = (s: number) => ((ay * s + by) * s + cy) * s;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let s = x;
    for (let i = 0; i < 22; i++) {
      s = (lo + hi) / 2;
      if (X(s) < x) lo = s;
      else hi = s;
    }
    return Y(s);
  };
}

/**
 * Version tabulée d'une courbe : 1024 échantillons précalculés, évaluation O(1) par
 * interpolation linéaire (erreur < 1e-6). `bezier()` résout x → y par 22 itérations de
 * dichotomie à chaque appel ; la scène en évalue des centaines par image, ce qui représentait
 * ≈ 57 % du temps de script pendant un changement de style (profil CPU, voir le rapport).
 */
export function tabulate(fn: (x: number) => number, n = 1024): (x: number) => number {
  const t = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) t[i] = fn(i / n);
  return (x) => {
    if (x <= 0) return t[0];
    if (x >= 1) return t[n];
    const f = x * n;
    const i = f | 0;
    return t[i] + (t[i + 1] - t[i]) * (f - i);
  };
}

/** `--k-ease` : l'easing unique de Karta. */
export const ease = bezier(0.2, 0, 0, 1);
export const easeIO = bezier(0.65, 0, 0.35, 1);
export const easeIn = bezier(0.4, 0, 1, 1);
/** Exponentiel sortant — révélations. */
export const expo = bezier(0.16, 1, 0.3, 1);
/** Exponentiel entrée-sortie — morphoses. */
export const expoIO = bezier(0.75, 0, 0.18, 1);

/** Ressort amorti normalisé sur [0,1] — dépassement ≈ 4 %, retenu. */
export function spring(p: number, z = 0.72, w = 12): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * p) * (Math.cos(wd * p) + ((z * w) / wd) * Math.sin(wd * p));
}

export const rgb = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
export const mixRgb = (a: number[], b: number[], p: number): Rgb =>
  a.map((v, i) => lerp(v, b[i], p)) as Rgb;
export const hex = (c: number[]): string =>
  '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Mélange linéaire de deux couleurs `#RRGGBB` (même formule que `mix()` du rendu du menu). */
export const mixHex = (a: string, b: string, p: number): string => hex(mixRgb(rgb(a), rgb(b), p));
export const css = (c: number[]): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  w: lerp(a.w, b.w, p),
  h: lerp(a.h, b.h, p),
});

type Cached = HTMLElement & { _c?: Record<string, string> };

/**
 * Écrit un style seulement s'il change : ~400 éléments sont animés par image, le cache
 * évite des milliers d'écritures DOM inutiles quand la scène est à l'arrêt.
 */
export function setStyle(el: HTMLElement, prop: string, val: string): void {
  const e = el as Cached;
  const cache = e._c ?? (e._c = {});
  if (cache[prop] !== val) {
    cache[prop] = val;
    (e.style as unknown as Record<string, string>)[prop] = val;
  }
}

/** Oublie le cache (après qu'un autre code a écrit directement dans `style`). */
export function resetStyleCache(el: HTMLElement): void {
  (el as Cached)._c = undefined;
}
