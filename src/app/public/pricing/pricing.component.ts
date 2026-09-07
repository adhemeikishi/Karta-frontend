import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingPricingComponent } from '../../landing/landing-pricing.component';
import { RevealOnScrollDirective } from '../../landing/reveal-on-scroll.directive';
import { FaqAccordionComponent } from '../faq-accordion.component';
import { FAQ_GROUPS } from '../public-content';
import { SeoService } from '../../shared/seo.service';

/**
 * Page `/pricing` — étend la section `#offres` de la landing en page complète.
 * Aucun prix ni fonctionnalité inventés : tout vient de `LANDING_OFFERS`
 * (`<landing-pricing>`, réutilisé tel quel, en cartes puis en tableau comparatif).
 * CTA → `/contact` (paiement hors périmètre V1).
 */
@Component({
  selector: 'app-pricing',
  imports: [
    RouterLink,
    LandingPricingComponent,
    RevealOnScrollDirective,
    FaqAccordionComponent,
  ],
  templateUrl: './pricing.component.html',
})
export class PricingComponent {
  readonly tarifsFaq = FAQ_GROUPS.find((g) => g.id === 'tarifs')!.items;

  constructor() {
    inject(SeoService).apply({
      title: 'Tarifs',
      description:
        'Trois offres Karta : BASIC 29,99 €, PRO 59,99 €, PREMIUM 99,99 € par mois (−10 % en annuel). Comparez les fonctionnalités.',
      path: '/pricing',
    });
  }
}
