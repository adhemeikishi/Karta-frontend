export interface QrCode {
  id: string;
  restaurantId: string;
  name: string;
  destinationUrl: string;
  code: string;
  redirectUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QrCodeStats {
  qrCodeId: string;
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
}
