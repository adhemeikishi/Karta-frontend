import { Component, input } from '@angular/core';
import { FaqItem } from './public-content';

/**
 * Accordéon FAQ — `<details>`/`<summary>` natifs : accessible au clavier et aux
 * lecteurs d'écran sans ARIA à maintenir, ouvrable sans JS. Une seule règle de
 * style, alignée sur le DS (filet `hairline`, `.h2`/`.lead` non concernés ici).
 * Réutilisé par `/faq` et la FAQ de `/pricing`.
 */
@Component({
  selector: 'app-faq-accordion',
  template: `
    <div class="divide-y" style="border-color: var(--k-hairline)">
      @for (item of items(); track item.q) {
        <details class="faq-item group">
          <summary class="faq-summary">
            <span class="text-sm font-semibold text-ink-900 sm:text-base">{{ item.q }}</span>
            <svg
              class="faq-chevron h-4 w-4 shrink-0 text-ink-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <p class="lead pb-5 pr-8">{{ item.a }}</p>
        </details>
      }
    </div>
  `,
})
export class FaqAccordionComponent {
  readonly items = input.required<readonly FaqItem[]>();
}
