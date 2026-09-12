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
 *   (`DesignResponse.customizable`, vrai pour PREMIUM seulement).
 */
export type PlanFeature = 'pdfMenu' | 'structuredMenu' | 'presets' | 'branding';

const FEATURES: Record<RestaurantOffer, readonly PlanFeature[]> = {
  BASIC: ['pdfMenu'],
  PRO: ['structuredMenu', 'presets'],
  PREMIUM: ['structuredMenu', 'presets', 'branding'],
};

export function can(offer: RestaurantOffer | null | undefined, feature: PlanFeature): boolean {
  return offer ? FEATURES[offer].includes(feature) : false;
}

/** Offre à partir de laquelle une capacité est ouverte — pour l'annoncer sans mentir. */
export function requiredOfferFor(feature: PlanFeature): RestaurantOffer {
  if (feature === 'branding') {
    return 'PREMIUM';
  }
  return feature === 'pdfMenu' ? 'BASIC' : 'PRO';
}
