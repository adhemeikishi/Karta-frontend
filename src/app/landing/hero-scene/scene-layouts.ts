import { Rect, ease, easeIO, lerp, prog } from './scene-math';

/**
 * Géométrie de la scène du hero. Le « monde » (QR, téléphone, menu) vit toujours dans le même
 * repère 1920×1080 ; seul change ce que la caméra en montre :
 *  - `wide` : cadre 1920×1080 ;
 *  - `tall` : cadre portrait (480 × H, H entre 760 et 1040) pour mobile — texte en haut, produit en bas.
 */

/** Écran du téléphone (viewport CSS d'un iPhone 390×844) dans le repère monde. */
export const SCREEN: Rect = { x: 765, y: 118, w: 390, h: 844 };

export interface Card {
  cx: number;
  cy: number;
  k: number;
}
export const SCAN_CARD: Card = { cx: 960, cy: 518, k: 1 };

export function cardRect(c: Card): Rect {
  const w = 310 * c.k;
  const h = 352 * c.k;
  return { x: c.cx - w / 2, y: c.cy - h / 2, w, h };
}
/** Cellule (rangée r, colonne col) du QR posé sur une carte. +1 : pas de jour entre modules. */
export function qrCell(c: Card, r: number, col: number): Rect {
  const R = cardRect(c);
  const m = 10 * c.k;
  return { x: R.x + 30 * c.k + col * m, y: R.y + 30 * c.k + r * m, w: m + 1, h: m + 1 };
}

export interface Cam {
  s: number;
  tx: number;
  ty: number;
}

export interface SceneLayout {
  kind: 'wide' | 'tall';
  W: number;
  H: number;
  finalCard: Card;
  phoneFinal: { fromDx: number; dx: number; dy: number; k: number; ry: number; ryFrom: number; rx: number };
  camera(t: number): Cam;
  /** Origine de la révélation topographique, en coordonnées du cadre. */
  topoOrigin: { x: number; y: number };
  /** Emprise de la topographie dans le cadre. */
  topo: { w: number; h: number; left: number; top: number };
}

const mix = (a: Cam, b: Cam, p: number): Cam => ({
  s: lerp(a.s, b.s, p),
  tx: lerp(a.tx, b.tx, p),
  ty: lerp(a.ty, b.ty, p),
});

/**
 * Caméra en trois états (ouverture → produit → composition finale) :
 * `0–1,7 s` ouverture · `1,7–3,1 s` recul vers le produit · `10–10,9 s` recul final.
 */
function cameraFrom(open0: Cam, open1: Cam, product: Cam, final: Cam): (t: number) => Cam {
  return (t) => {
    if (t < 1.7) return mix(open0, open1, ease(prog(t, 0, 1.7)));
    if (t < 10) {
      const p = easeIO(prog(t, 1.7, 1.4));
      const b = mix(open1, product, p);
      return { s: b.s * (1 + 0.05 * ease(prog(t, 4.4, 5.6))), tx: b.tx, ty: b.ty };
    }
    const p = easeIO(prog(t, 10, 0.9));
    const b = mix({ s: product.s * 1.05, tx: product.tx, ty: product.ty }, final, p);
    return { s: b.s * (1 + 0.012 * ease(prog(t, 12, 2))), tx: b.tx, ty: b.ty };
  };
}

export function makeLayout(kind: 'wide' | 'tall', W: number, H: number): SceneLayout {
  let camera: (t: number) => Cam;
  let finalCard: Card;
  let phoneFinal: SceneLayout['phoneFinal'];
  let topo: SceneLayout['topo'];

  if (kind === 'wide') {
    // Plan macro sur les modules du QR, puis recul qui se pose sur le plan d'ouverture (s 1,15 · tx 140).
    camera = cameraFrom(
      { s: 3.4, tx: 300, ty: -20 },
      { s: 1.15, tx: 140, ty: 0 },
      { s: 1, tx: 140, ty: 0 },
      { s: 1, tx: 0, ty: 0 },
    );
    finalCard = { cx: 1130, cy: 560, k: 1.1 };
    phoneFinal = { fromDx: 1300, dx: 620, dy: 20, k: 0.86, ry: 7, ryFrom: 18, rx: 1.5 };
    topo = { w: 1920, h: 1080, left: 0, top: 0 };
  } else {
    /** Caméra qui place le point monde (wx, wy) en (fx, fy) du cadre, à l'échelle s. */
    const focus = (wx: number, wy: number, fx: number, fy: number, s: number): Cam => ({
      s,
      tx: fx - W / 2 - (wx - 960) * s,
      ty: fy - H / 2 - (wy - 540) * s,
    });
    // Texte en haut (sous la navbar), produit dans la moitié basse. Sur un cadre court, le téléphone et la carte
    // finale descendent (planchers 384 et 566) pour laisser la place au texte. Le téléphone occupe ~83 % de la
    // largeur (échelle 0,95) et sort par le bas, comme sur un vrai écran.
    camera = cameraFrom(
      focus(960, 518, W / 2, H * 0.64, 1.2),
      focus(960, 518, W / 2, H * 0.64, 1.02),
      focus(960, 104, W / 2, Math.max(H * 0.4, 384), 0.95),
      focus(1000, 700, W / 2, Math.max(H * 0.62, 566), 0.65),
    );
    finalCard = { cx: 800, cy: 640, k: 1 };
    phoneFinal = { fromDx: 700, dx: 230, dy: 260, k: 0.74, ry: 6, ryFrom: 14, rx: 1.2 };
    topo = { w: 480, h: 1100, left: 0, top: 0 };
  }

  const end = camera(14);
  const topoOrigin = {
    x: W / 2 + (finalCard.cx - 960) * end.s + end.tx,
    y: H / 2 + (finalCard.cy - 540) * end.s + end.ty,
  };
  return { kind, W, H, finalCard, phoneFinal, camera, topoOrigin, topo };
}
