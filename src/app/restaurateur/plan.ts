import { RestaurantOffer } from '../models/restaurant.model';

/**
 * Ce que l'offre du restaurant ouvre réellement.
 *
 * <strong>Un seul endroit.</strong> Sans cela, des `if (offer === 'PRO')` finiraient
 * dispersés dans chaque écran, et le jour où une offre change de contenu il faudrait les
 * retrouver tous. Ici, une seule table à relire.
 *
 * Cette table n'invente rien : elle est le miroir exact de ce que le backend autorise.
 * Une capacité qui n'existe pas côté serveur n'a pas sa place ici — elle produirait un
 * bouton qui échoue.
 *
 * - `pdfMenu`      — la carte diffusée est un PDF (offre BASIC, `MenuService.typeFor`) ;
 * - `structuredMenu` / `presets` — carte numérique et cinq styles
 *   (`MenuDesignService.requireStructuredOffer` refuse BASIC) ;
 * - `branding`     — nom affiché, couleurs, logo, image d'en-tête
 *   (`DesignResponse.customizable`, vrai pour PREMIUM seulement) ;
 * - `noBranding`, `fonts`, `qrDesign`, `itemPhotos`, `translations` — personnalisation
 *   avancée : enregistrée par le même `PUT .../menu/design` (ou avec le contenu pour les
 *   photos et traductions), rendue par `MenuThemeResolver` / `PublicMenuService` pour
 *   PREMIUM seulement.
 */
export type PlanFeature =
  | 'pdfMenu'
  | 'structuredMenu'
  | 'presets'
  | 'branding'
  | 'noBranding'
  | 'fonts'
  | 'qrDesign'
  | 'itemPhotos'
  | 'translations';

const PREMIUM_ONLY: readonly PlanFeature[] = [
  'branding',
  'noBranding',
  'fonts',
  'qrDesign',
  'itemPhotos',
  'translations',
];

const FEATURES: Record<RestaurantOffer, readonly PlanFeature[]> = {
  BASIC: ['pdfMenu'],
  PRO: ['structuredMenu', 'presets'],
  PREMIUM: ['structuredMenu', 'presets', ...PREMIUM_ONLY],
};

export function can(offer: RestaurantOffer | null | undefined, feature: PlanFeature): boolean {
  return offer ? FEATURES[offer].includes(feature) : false;
}

/** Offre à partir de laquelle une capacité est ouverte — pour l'annoncer sans mentir. */
export function requiredOfferFor(feature: PlanFeature): RestaurantOffer {
  if (PREMIUM_ONLY.includes(feature)) {
    return 'PREMIUM';
  }
  return feature === 'pdfMenu' ? 'BASIC' : 'PRO';
}

/** Langues de la carte proposées en plus du français — miroir de `MenuLanguage` côté backend. */
export const MENU_LANGUAGES: readonly { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
];
