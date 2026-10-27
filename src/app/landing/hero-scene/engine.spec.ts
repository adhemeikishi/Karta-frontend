import { SceneLayout, cardRect, makeLayout } from './scene-layouts';
import { bezier, ease, expo, tabulate } from './scene-math';
import { KeyMap, pchipMap } from './scroll-driver';
import { REV } from './karta-scene';

/**
 * Logique pure de la scène du hero : ces tests verrouillent ce qu'un œil ne verrait qu'en
 * défilant — un saut de caméra, un palier qui avance, un QR final hors cadre.
 */

const CASES: [string, 'wide' | 'tall', number, number][] = [
  ['wide', 'wide', 1920, 1080],
  ['tall · 760', 'tall', 480, 760],
  ['tall · 862', 'tall', 480, 862],
  ['tall · 1039', 'tall', 480, 1039],
];

describe('hero — caméra', () => {
  for (const [name, kind, W, H] of CASES) {
    describe(name, () => {
      const layout: SceneLayout = makeLayout(kind, W, H);

      it('est continue aux jonctions (aucun saut visuel à 1,7 s, 10 s, 10,9 s)', () => {
        for (const t of [1.7, 10, 10.9]) {
          const a = layout.camera(t - 1e-3);
          const b = layout.camera(t + 1e-3);
          expect(Math.abs(a.s - b.s)).toBeLessThan(0.01);
          expect(Math.abs(a.tx - b.tx)).toBeLessThan(2);
          expect(Math.abs(a.ty - b.ty)).toBeLessThan(2);
        }
      });

      it('ne produit que des valeurs finies, sur toute la durée', () => {
        for (let t = 0; t <= 14; t += 0.05) {
          const c = layout.camera(t);
          expect(Number.isFinite(c.s) && Number.isFinite(c.tx) && Number.isFinite(c.ty)).toBeTrue();
          expect(c.s).toBeGreaterThan(0.3);
        }
      });

      it('garde le QR final entièrement dans le cadre', () => {
        const c = layout.camera(14);
        const R = cardRect(layout.finalCard);
        expect(W / 2 + (R.x - 960) * c.s + c.tx).toBeGreaterThan(0);
        expect(W / 2 + (R.x + R.w - 960) * c.s + c.tx).toBeLessThan(W);
        expect(H / 2 + (R.y - 540) * c.s + c.ty).toBeGreaterThan(0);
        expect(H / 2 + (R.y + R.h - 540) * c.s + c.ty).toBeLessThan(H);
      });

      it("révèle la topographie depuis le QR final, à l'intérieur du cadre", () => {
        expect(layout.topoOrigin.x).toBeGreaterThan(0);
        expect(layout.topoOrigin.x).toBeLessThan(W);
        expect(layout.topoOrigin.y).toBeGreaterThan(0);
        expect(layout.topoOrigin.y).toBeLessThan(H);
      });
    });
  }

  it("démarre en plan macro sur le QR puis recule sans jamais regrossir, jusqu'au plan d'ouverture", () => {
    const L = makeLayout('wide', 1920, 1080);
    expect(L.camera(0).s).toBeGreaterThan(3);
    for (let t = 0.05; t <= 1.7; t += 0.05) expect(L.camera(t).s).toBeLessThanOrEqual(L.camera(t - 0.05).s + 1e-9);
    const open = L.camera(1.7);
    expect(open.s).toBeCloseTo(1.15, 9);
    expect(open.tx).toBeCloseTo(140, 9);
    expect(open.ty).toBeCloseTo(0, 9);
  });
});

/** Référence : interpolation linéaire par morceaux (ce qu'`pchipMap` remplace). */
function linearMap(keys: KeyMap): (p: number) => number {
  return (p) => {
    if (p <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (p <= keys[i][0]) {
        const [p0, t0] = keys[i - 1];
        const [p1, t1] = keys[i];
        return p1 === p0 ? t1 : t0 + ((t1 - t0) * (p - p0)) / (p1 - p0);
      }
    }
    return keys[keys.length - 1][1];
  };
}

describe('scroll — interpolation monotone (pchipMap)', () => {
  const keys: KeyMap = [
    [0, 5.5], [0.03, 5.5], [0.18, 6.95], [0.22, 7.25], [0.26, 7.25], [0.3, 7.95], [0.44, 8.95], [0.49, 8.95],
    [0.62, 9.9], [0.67, 9.9], [0.84, 11.9], [0.93, 13.9], [1, 13.99],
  ];
  const linear = linearMap(keys);
  const smooth = pchipMap(keys);
  const N = 2000;
  const slopes = (f: (p: number) => number) => Array.from({ length: N }, (_, i) => (f((i + 1) / N) - f(i / N)) * N);
  const maxJump = (sl: number[]) => Math.max(...sl.slice(1).map((v, i) => Math.abs(v - sl[i])));

  it('passe exactement par chaque repère', () => {
    for (const [p, t] of keys) expect(smooth(p)).toBeCloseTo(t, 9);
  });

  it('reste strictement monotone : la scène ne recule jamais quand on avance', () => {
    let prev = -Infinity;
    for (let i = 0; i <= N; i++) {
      const t = smooth(i / N);
      expect(t).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = t;
    }
  });

  it('tient ses paliers (pente nulle aux deux bords)', () => {
    expect(smooth(0.045)).toBeCloseTo(smooth(0.04), 1);
    expect(smooth(0.255)).toBeCloseTo(7.25, 6);
    expect(smooth(0.47)).toBeCloseTo(8.95, 6);
  });

  it("vitesse continue : les à-coups de vitesse sont au moins 10 fois plus faibles qu'une interpolation linéaire par morceaux", () => {
    const jl = maxJump(slopes(linear));
    const js = maxJump(slopes(smooth));
    expect(js).toBeLessThan(jl / 10);
  });
});

describe('scène — courbes', () => {
  it('tabulate reproduit la courbe à moins de 1e-4 près', () => {
    for (const [name, f] of [['ease', ease], ['expo', expo]] as const) {
      const t = tabulate(f);
      for (let i = 0; i <= 2000; i++) expect(Math.abs(t(i / 2000) - f(i / 2000))).withContext(name).toBeLessThan(1e-4);
    }
  });

  it('REV (révélations) démarre et finit à pente ≈ 0, sans pic de vitesse', () => {
    const d = (x: number) => (REV(x + 0.001) - REV(x - 0.001)) / 0.002;
    expect(d(0.002)).toBeLessThan(0.2);
    expect(d(0.998)).toBeLessThan(0.2);
    let max = 0;
    for (let x = 0.01; x < 1; x += 0.005) max = Math.max(max, d(x));
    expect(max).toBeLessThan(3.2);
  });

  it('REV est strictement bornée dans [0, 1]', () => {
    for (let x = 0; x <= 1; x += 0.001) {
      expect(REV(x)).toBeGreaterThanOrEqual(0);
      expect(REV(x)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
