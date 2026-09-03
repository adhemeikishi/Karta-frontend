import { Component, OnDestroy, effect, input, signal } from '@angular/core';

/** ~1.4s : dans la fourchette 1.2–1.6s demandée pour le compteur de prix. */
export const PRICE_COUNTER_DURATION_MS = 1400;

/**
 * Formate un montant en euros à la française : virgule décimale, espace fine
 * insécable (U+202F) tous les 3 chiffres (ex. `1 079,99`). Local au pricing de la
 * landing — `formatPriceInput` (menu-draft.model.ts, saisie prix de plat) ne gère pas
 * les milliers, ce n'est pas son usage ; on ne le modifie pas pour un besoin différent.
 */
export function formatEuro(amount: number): string {
  const [intPart, decPart] = Math.abs(amount).toFixed(2).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = amount < 0 ? '-' : '';
  return `${sign}${withThousands},${decPart}`;
}

/**
 * Valeur interpolée entre `from` et `to` après `elapsedMs` sur une durée totale
 * `durationMs`, avec un ease-out cubique (même famille que `--k-ease`). Fonction pure
 * — testable sans mocker `requestAnimationFrame`/`performance.now()`.
 */
export function interpolatePrice(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs: number = PRICE_COUNTER_DURATION_MS,
): number {
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const eased = 1 - Math.pow(1 - t, 3);
  return from + (to - from) * eased;
}

/**
 * Anime un prix comme un compteur (façon `CountAnimation` de la référence fournie,
 * reproduit nativement — pas de dépendance ajoutée). Fonctionne à l'initialisation
 * et à chaque changement de `value` (ex. bascule mensuel/annuel). Formatage via
 * `formatEuro` ci-dessus.
 */
@Component({
  selector: 'landing-price-counter',
  standalone: true,
  template: `<span class="mono tnum">{{ displayed() }}</span>`,
})
export class LandingPriceCounterComponent implements OnDestroy {
  readonly value = input.required<number>();
  readonly displayed = signal('0,00');

  private animatedFrom = 0;
  private raf?: number;

  constructor() {
    effect(() => {
      this.animateTo(this.value());
    });
  }

  ngOnDestroy(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
  }

  private animateTo(target: number): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.animatedFrom = target;
      this.displayed.set(formatEuro(target));
      return;
    }

    const from = this.animatedFrom;
    const start = performance.now();

    const tick = (now: number): void => {
      const elapsed = now - start;
      this.displayed.set(formatEuro(interpolatePrice(from, target, elapsed)));
      if (elapsed < PRICE_COUNTER_DURATION_MS) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.animatedFrom = target;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }
}
