import { RestaurantOffer } from '../models/restaurant.model';

/** Classe du libellé d'offre (BASIC/PRO/PREMIUM) — texte simple, voir `.badge-offer`
 *  dans styles.css. Même graphie pour les 3 offres (plus de traitement métallique).
 *  Signature conservée (`offer` ignoré) pour ne pas toucher les appelants. */
export function offerBadgeClass(_offer: RestaurantOffer): string {
  return 'badge-offer';
}
