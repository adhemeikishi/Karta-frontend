/** Offre commerciale Karta V1 (voir RestaurantOffer côté backend). 1 restaurant = 1 offre. */
export type RestaurantOffer = 'BASIC' | 'PRO' | 'PREMIUM';

export const RESTAURANT_OFFERS: readonly RestaurantOffer[] = ['BASIC', 'PRO', 'PREMIUM'];

export interface Restaurant {
  id: string;
  name: string;
  offer: RestaurantOffer;
  /**
   * Date de fin d'onboarding, `null` s'il reste à faire.
   *
   * Posée côté serveur à la première publication du menu, et jamais retirée ensuite
   * (voir `Restaurant.completeOnboarding` côté backend). C'est ce champ — et lui seul —
   * qui décide si le restaurateur ouvre son espace ou son parcours de configuration :
   * rien n'est mémorisé dans le navigateur, donc changer d'appareil ne change rien.
   */
  onboardingCompletedAt: string | null;
  /** Interrupteur commercial Karta Pay — décidé par Karta, jamais par le restaurateur. */
  kartaPayEnabled: boolean;
  /**
   * Abonnement payé, indépendant de `offer` (voir `Restaurant.subscriptionActive` côté
   * backend) : `offer` dit quel niveau de fonctionnalités le restaurant utilise,
   * `subscriptionActive` dit s'il a payé pour l'utiliser. Un compte créé par inscription
   * libre-service démarre à `false` — jamais recalculé côté frontend, toujours relu ici.
   */
  subscriptionActive: boolean;
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

/** Correspond à KartaPayDashboardDtos.RevenuePeriods. */
export interface RevenuePeriods {
  todayCents: number;
  thisWeekCents: number;
  thisMonthCents: number;
}

/** Correspond à KartaPayDashboardDtos.TopItem. */
export interface TopItem {
  name: string;
  quantity: number;
  revenueCents: number;
}

/** Correspond à KartaPayDashboardDtos.ItemShare — une part du CA de la fenêtre, un plat ou "Autres". */
export interface ItemShare {
  name: string;
  revenueCents: number;
  percentage: number;
}

/** Nombre de scans pour une heure de la journée (0-23), sur la fenêtre de 30 jours du tableau de bord. */
export interface HourlyScans {
  hour: number;
  scans: number;
}

/**
 * Correspond à KartaPayDashboardDtos.KartaPayDashboardResponse
 * (`GET /api/admin/restaurants/{id}/karta-pay/dashboard`).
 *
 * Tout calcul (CA, panier moyen, pourcentages) est fait côté backend : ce type ne fait que
 * refléter la réponse, aucun recalcul métier ne doit avoir lieu côté Angular.
 */
export interface KartaPayDashboardStats {
  qrScans: RestaurantScanStats;
  revenue: RevenuePeriods;
  topItems: TopItem[];
  revenueBreakdown: ItemShare[];
  avgBasketCents: number;
  peakHours: HourlyScans[];
}
