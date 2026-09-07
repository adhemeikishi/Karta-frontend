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
  /** Phrase courte en exergue, sous le prix (les guillemets sont ajoutés par le template). */
  quote: string;
  /** Première ligne de la liste, mise en avant (ex. « Tout de Basic, plus : »). */
  featuresLead: string;
  /** Sous-liste de fonctionnalités affichée dans la carte. */
  features: readonly string[];
  /** Note de bas de carte (PREMIUM uniquement). */
  footnote?: string;
  /** Libellé du bouton d'action. */
  cta: string;
  /** Aligné index à index sur `LANDING_CAPABILITIES` — utilisé par le tableau comparatif. */
  included: readonly boolean[];
  highlighted: boolean;
  pricing: LandingOfferPricing;
}

export const LANDING_OFFERS: readonly LandingOffer[] = [
  {
    id: 'BASIC',
    quote: 'Votre menu est en ligne.',
    featuresLead: 'QR + PDF',
    features: [
      'URL personnalisée',
      'Informations du restaurant',
      'Horaires & coordonnées',
      'Statistiques de scans',
      'Branding Karta visible',
    ],
    cta: 'Commencer',
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
    quote: 'Votre menu devient digital.',
    featuresLead: 'Tout de Basic, plus :',
    features: [
      'KartaAI',
      'Menu structuré',
      '5 presets',
      'Éditeur',
      'Aperçu',
      'Publication',
      'Branding Karta visible',
    ],
    cta: 'Passer à Pro',
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
    quote: 'Votre menu devient votre identité.',
    featuresLead: 'Tout de Pro, plus :',
    features: [
      'Nom du restaurant',
      'Logo',
      'Couleur principale',
      'Couleur secondaire',
      'Image',
      'White-label',
    ],
    footnote: 'Idéal pour les restaurants avec une véritable identité de marque.',
    cta: 'Créer mon menu',
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
