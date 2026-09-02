/** Offre commerciale Karta V1 (voir RestaurantOffer côté backend). 1 restaurant = 1 offre. */
export type RestaurantOffer = 'BASIC' | 'PRO' | 'PREMIUM';

export const RESTAURANT_OFFERS: readonly RestaurantOffer[] = ['BASIC', 'PRO', 'PREMIUM'];

export interface Restaurant {
  id: string;
  name: string;
  offer: RestaurantOffer;
  createdAt: string;
  updatedAt: string;
}

/** Correspond à RestaurantSummaryResponse côté backend (liste enrichie avec compteurs). */
export interface RestaurantSummary extends Restaurant {
  qrCodeCount: number;
  activeQrCodeCount: number;
  totalScans: number;
}
