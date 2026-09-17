import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Une fonctionnalité réservée — à Premium, ou à un abonnement payé — vue par un compte
 * qui ne l'a pas.
 *
 * Toujours la même forme, partout : le libellé, une phrase de bénéfice, et une porte de
 * sortie. Cacher la fonctionnalité en silence ferait croire qu'elle n'existe pas ; l'afficher
 * active mais en échec serait pire. Le back-office change lui-même l'offre du client, donc
 * pas de lien vers les tarifs dans cet espace — seulement l'information.
 *
 * `badge`/`ctaLabel` couvrent le second cas d'usage : un restaurant sans abonnement actif
 * (voir `RestaurantContextService` / `Restaurant.subscriptionActive`), qui n'a rien à voir
 * avec l'offre choisie — même porte de sortie, `/pricing`, vocabulaire différent.
 */
@Component({
  selector: 'app-premium-lock',
  imports: [RouterLink],
  template: `
    <div class="premium-lock">
      <div class="min-w-0">
        <p class="premium-lock-title">
          {{ label() }}
          <span class="badge badge-inactive ml-2 align-middle">{{ badge() }}</span>
        </p>
        <p class="premium-lock-text">{{ description() }}</p>
      </div>
      @if (space() === 'restaurateur') {
        <a routerLink="/pricing" class="btn btn-outline btn-sm shrink-0">{{ ctaLabel() }}</a>
      } @else {
        <span class="text-xs text-ink-400">Passez ce client en Premium pour l’activer.</span>
      }
    </div>
  `,
})
export class PremiumLockComponent {
  readonly label = input.required<string>();
  readonly description = input.required<string>();
  /** Même règle que le studio : seul le vocabulaire change entre les deux espaces. */
  readonly space = input<'admin' | 'restaurateur'>('restaurateur');
  readonly badge = input<string>('Premium');
  readonly ctaLabel = input<string>('Découvrir Premium');
}
