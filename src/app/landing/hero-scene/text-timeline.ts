import { clamp, easeIn, expo, prog, setStyle } from './scene-math';

interface Block {
  el: HTMLElement;
  tin: number;
  tout: number;
  rise: number;
  dur: number;
  stagger: number;
  lines: HTMLElement[];
}

/**
 * Typographie pilotée par `t` : chaque bloc `[data-in][data-out]` (secondes de la scène)
 * est révélé ligne par ligne derrière un masque, avec une courte montée et une opacité
 * contrôlée — jamais lettre par lettre. Sorties courtes, dans des fenêtres distinctes
 * des entrées : deux textes ne se chevauchent jamais.
 *
 * Structure attendue : `.ks-blk[data-in][data-out] > .ks-ln > *`. Un bloc caché est
 * `visibility:hidden` (hors ordre de tabulation et hors lecteur d'écran) ; visible, il
 * reste cliquable — les boutons de la scène sont de vrais liens.
 *
 * Options par bloc : `data-rise` (% de la hauteur de ligne, défaut 34),
 * `data-dur` (s, défaut 0,85), `data-stagger` (s entre lignes, défaut 0,08).
 */
export class TextTimeline {
  private readonly blocks: Block[];

  constructor(root: HTMLElement) {
    // Ponctuation des titres : même correction de chasse que `.hero-dot` sur le site (800 en capitales).
    root.querySelectorAll<HTMLElement>('h1 .ks-ln > span, h2 .ks-ln > span').forEach((s) => {
      if (s.children.length === 0 && s.textContent) {
        const frag = document.createDocumentFragment();
        for (const part of s.textContent.split(/([,.])(?=\s|$)/)) {
          if (part === ',' || part === '.') {
            const p = document.createElement('span');
            p.className = 'ks-pt';
            p.textContent = part;
            frag.appendChild(p);
          } else if (part) frag.appendChild(document.createTextNode(part));
        }
        s.replaceChildren(frag);
      }
    });
    this.blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-in]')).map((el) => ({
      el,
      tin: Number(el.dataset['in']),
      tout: el.dataset['out'] ? Number(el.dataset['out']) : 99,
      rise: Number(el.dataset['rise'] ?? 34),
      dur: Number(el.dataset['dur'] ?? 0.85),
      stagger: Number(el.dataset['stagger'] ?? 0.08),
      lines: Array.from(el.querySelectorAll<HTMLElement>('.ks-ln > *')),
    }));
  }

  update(t: number): void {
    for (const b of this.blocks) {
      const vis = t >= b.tin && t < b.tout + 0.6;
      setStyle(b.el, 'visibility', vis ? 'visible' : 'hidden');
      if (!vis) continue;
      b.lines.forEach((s, i) => {
        const pin = expo(prog(t, b.tin + i * b.stagger, b.dur));
        const pout = easeIn(prog(t, b.tout + i * 0.025, 0.32));
        setStyle(s, 'transform', pin >= 1 && pout <= 0 ? 'none' : `translateY(${((1 - pin) * b.rise - pout * 16).toFixed(2)}%)`);
        setStyle(s, 'opacity', (clamp(pin / 0.55) * (1 - pout)).toFixed(3));
      });
    }
  }
}
