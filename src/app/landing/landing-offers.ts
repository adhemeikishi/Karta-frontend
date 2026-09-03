import { RestaurantOffer } from '../models/restaurant.model';

/**
 * Contenu marketing des 3 offres réelles de Karta (voir `RestaurantOffer`).
 * Source unique pour la landing page — les noms d'offre (`BASIC`/`PRO`/`PREMIUM`) et
 * les fonctionnalités ne doivent jamais diverger de la réalité produit. Matrice
 * alignée sur DESIGN.md §13.
 *
 * Hiérarchie commerciale : PRO est l'offre recommandée (meilleur rapport
 * valeur/simplicité) — PREMIUM est l'offre supérieure pour qui veut davantage de
 * personnalisation, jamais présentée comme « la recommandée ».
 *
 * Tarifs définitifs fournis par le produit (aucun montant calculé ni inventé ici) :
 * `yearlyDiscounted` et `discountLabel` sont des valeurs de la source, pas dérivées
 * l'une de l'autre — `discountLabel` reste « -10% » tel que fourni même si le calcul
 * exact `1 - yearlyDiscounted/yearlyOriginal` diffère légèrement selon l'offre.
 */
export const LANDING_CAPABILITIES = [
  'QR unique et permanent',
  'Statistiques de scans',
  'Menu structuré (éditeur + 5 styles)',
  'KartaAI — import PDF assisté',
  'Personnalisation visuelle complète',
] as const;

export interface LandingOfferPricing {
  /** Prix mensuel, en euros. */
  monthly: number;
  /** Prix annuel avant réduction, en euros — affiché barré en mode Annuel. */
  yearlyOriginal: number;
  /** Prix annuel après réduction, en euros — le montant réellement facturé. */
  yearlyDiscounted: number;
  /** Libellé du badge de réduction (ex. « -10% »), fourni tel quel — jamais recalculé. */
  discountLabel: string;
}

export interface LandingOffer {
  id: RestaurantOffer;
  tagline: string;
  /** Positionnement court (« pour qui »), affiché sous le tagline. */
  audience: string;
  /** Aligné index à index sur `LANDING_CAPABILITIES`. */
  included: readonly boolean[];
  highlighted: boolean;
  pricing: LandingOfferPricing;
}

export const LANDING_OFFERS: readonly LandingOffer[] = [
  {
    id: 'BASIC',
    tagline: 'Votre carte PDF, servie par QR.',
    audience: 'Pour découvrir Karta.',
    included: [true, true, false, false, false],
    highlighted: false,
    pricing: {
      monthly: 29.99,
      yearlyOriginal: 359.99,
      yearlyDiscounted: 319.99,
      discountLabel: '-10%',
    },
  },
  {
    id: 'PRO',
    tagline: 'Menu structuré, mis à jour en un instant.',
    audience: 'Le meilleur rapport valeur pour un menu vivant.',
    included: [true, true, true, true, false],
    highlighted: true,
    pricing: {
      monthly: 59.99,
      yearlyOriginal: 719.99,
      yearlyDiscounted: 649.99,
      discountLabel: '-10%',
    },
  },
  {
    id: 'PREMIUM',
    tagline: "L'identité complète du restaurant.",
    audience: 'Pour les restaurants qui veulent davantage de personnalisation.',
    included: [true, true, true, true, true],
    highlighted: false,
    pricing: {
      monthly: 99.99,
      yearlyOriginal: 1199.99,
      yearlyDiscounted: 1079.99,
      discountLabel: '-10%',
    },
  },
];
