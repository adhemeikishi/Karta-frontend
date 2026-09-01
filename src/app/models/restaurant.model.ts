export interface Restaurant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Correspond à RestaurantSummaryResponse côté backend (liste enrichie avec compteurs). */
export interface RestaurantSummary extends Restaurant {
  qrCodeCount: number;
  activeQrCodeCount: number;
  totalScans: number;
}
