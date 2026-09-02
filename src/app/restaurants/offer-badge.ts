import { RestaurantOffer } from '../models/restaurant.model';

/** Classes du badge d'offre (voir .badge* dans styles.css). Partagé liste + détail. */
export function offerBadgeClass(offer: RestaurantOffer): string {
  switch (offer) {
    case 'PREMIUM':
      return 'badge badge-premium';
    case 'PRO':
      return 'badge badge-pro';
    default:
      return 'badge badge-basic';
  }
}
