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

/** Un jour de la série de scans. `date` est une date locale ISO (`2026-09-02`). */
export interface DailyScans {
  date: string;
  scans: number;
}

/**
 * Correspond à QrScanService.RestaurantScanStats
 * (`GET /api/admin/restaurants/{id}/stats`).
 *
 * Les compteurs de période et `daily` sont calculés côté backend à partir des mêmes
 * données : le graphique ne peut pas contredire les chiffres affichés au-dessus.
 * `total` couvre tout l'historique, au-delà de la fenêtre de 30 jours.
 */
export interface RestaurantScanStats {
  today: number;
  last7Days: number;
  last30Days: number;
  total: number;
  daily: DailyScans[];
}
