import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { offerBadgeClass } from '../restaurants/offer-badge';
import { formatEuro, LandingPriceCounterComponent } from './landing-price-counter.component';
import { LANDING_CAPABILITIES, LANDING_OFFERS, LandingOffer } from './landing-offers';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

export type BillingCycle = 'monthly' | 'yearly';

/**
 * Les 3 offres réelles — source unique (`LANDING_OFFERS`), tarifs définitifs fournis
 * par le produit (voir landing-offers.ts). `layout` change uniquement la mise en
 * scène (cartes vs. tableau comparatif dense) : le contenu et les règles métier ne
 * dupliquent jamais.
 *
 * Le switch Mensuel/Annuel est commun aux trois offres (un seul état, pas un par
 * carte).
 */
@Component({
  selector: 'landing-pricing',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, LandingPriceCounterComponent],
  templateUrl: './landing-pricing.component.html',
})
export class LandingPricingComponent {
  readonly layout = input<'cards' | 'table'>('cards');
  readonly offers = LANDING_OFFERS;
  readonly capabilities = LANDING_CAPABILITIES;
  readonly offerBadgeClass = offerBadgeClass;
  readonly formatEuro = formatEuro;

  readonly billingCycle = signal<BillingCycle>('monthly');

  /** Identique sur les 3 offres (voir landing-offers.ts) — un seul badge, rattaché au
   *  toggle plutôt que répété sur chaque carte. */
  readonly discountLabel = LANDING_OFFERS[0].pricing.discountLabel;

  setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  /** Montant à animer dans le compteur pour cette offre au cycle courant. */
  currentAmount(offer: LandingOffer): number {
    return this.billingCycle() === 'monthly' ? offer.pricing.monthly : offer.pricing.yearlyDiscounted;
  }
}
