import { RestaurantOffer } from '../models/restaurant.model';

/**
 * Contenu marketing des pages publiques secondaires (`/features`, `/faq`, `/pricing`).
 *
 * SOURCE DE VÉRITÉ : la landing (`variant-editorial.component.html`) et les données
 * déjà centralisées (`landing-offers.ts`, `landing-menu-presets.ts`). Rien n'est
 * inventé ici — chaque ligne reformule une information déjà présente sur `/`, et
 * chaque capacité a été vérifiée contre le code produit (`RestaurantOffer.java`,
 * `MenuPreset.java`, `MenuDesignService`, package `kartaai`) :
 *
 *   - BASIC   = QR permanent → menu PDF. Pas de studio de design.
 *   - PRO     = QR permanent → menu HTML mobile structuré + 5 presets + éditeur + KartaAI.
 *   - PREMIUM = tout PRO + personnalisation visuelle (nom, logo, image d'en-tête,
 *               couleur principale, couleur secondaire).
 *   - Le paiement et le changement d'offre sont hors périmètre V1 → CTA « choisir une
 *     offre » = /contact, pas un paiement en ligne.
 */

export type Tier = RestaurantOffer; // 'BASIC' | 'PRO' | 'PREMIUM'

export interface PublicFeature {
  name: string;
  description: string;
  benefit: string;
  /** Offres qui incluent la fonctionnalité. */
  tiers: readonly Tier[];
}

export interface PublicFeatureGroup {
  id: string;
  title: string;
  features: readonly PublicFeature[];
}

const ALL: readonly Tier[] = ['BASIC', 'PRO', 'PREMIUM'];
const PRO_UP: readonly Tier[] = ['PRO', 'PREMIUM'];
const PREMIUM_ONLY: readonly Tier[] = ['PREMIUM'];

/** Fonctionnalités réelles, regroupées. Reprises des sections de la landing. */
export const FEATURE_GROUPS: readonly PublicFeatureGroup[] = [
  {
    id: 'qr',
    title: 'QR Code',
    features: [
      {
        name: 'QR unique et permanent',
        description:
          "Vous le collez une fois sur vos tables. Il reste valide quand vous changez un prix, retirez un plat ou refaites toute la carte.",
        benefit: 'Imprimé une seule fois. Jamais à refaire.',
        tiers: ALL,
      },
    ],
  },
  {
    id: 'menu',
    title: 'Menu',
    features: [
      {
        name: 'Menu accessible par QR',
        description:
          "Votre carte est en ligne, accessible à chaque table. En BASIC elle est servie en PDF ; en PRO et PREMIUM en menu mobile structuré.",
        benefit: 'Votre menu est en ligne.',
        tiers: ALL,
      },
      {
        name: 'Menu structuré',
        description:
          "Catégories, plats, prix, descriptions : un menu structuré que vous mettez à jour en un instant, pas un fichier à régénérer.",
        benefit: 'Modifier. Publier. Terminé.',
        tiers: PRO_UP,
      },
      {
        name: 'Éditeur, aperçu et publication',
        description:
          "Vous modifiez, vous voyez le rendu, vous publiez quand vous êtes prêt. Rien n'est publié tant que vous ne l'avez pas décidé.",
        benefit: 'Vous gardez la main sur ce qui est en ligne.',
        tiers: PRO_UP,
      },
    ],
  },
  {
    id: 'import',
    title: 'Import',
    features: [
      {
        name: 'Import de votre carte existante',
        description:
          "Vous partez de votre PDF actuel. Pas de ressaisie : Karta lit la carte que vous avez déjà.",
        benefit: 'Votre menu existe déjà.',
        tiers: PRO_UP,
      },
    ],
  },
  {
    id: 'kartaai',
    title: 'KartaAI',
    features: [
      {
        name: 'KartaAI — import PDF assisté',
        description:
          "KartaAI transforme votre PDF en menu structuré. Vous relisez le résultat plat par plat ; rien n'est publié tant que vous ne l'avez pas validé.",
        benefit: 'Des heures de saisie en une relecture.',
        tiers: PRO_UP,
      },
    ],
  },
  {
    id: 'personnalisation',
    title: 'Personnalisation',
    features: [
      {
        name: '5 styles',
        description:
          "Modern, Dark, Street Food, Minimal, Luxe. Le contenu ne bouge pas : mêmes plats, mêmes prix. Seul le style change.",
        benefit: 'Un menu. Cinq identités.',
        tiers: PRO_UP,
      },
      {
        name: 'Personnalisation visuelle complète',
        description:
          "Nom affiché, logo, image d'en-tête, couleur principale, couleur secondaire. Le texte s'adapte automatiquement pour rester lisible.",
        benefit: 'Le menu ressemble à votre restaurant.',
        tiers: PREMIUM_ONLY,
      },
    ],
  },
  {
    id: 'statistiques',
    title: 'Statistiques',
    features: [
      {
        name: 'Statistiques de scans',
        description:
          "Combien de personnes ouvrent votre menu, et quand. Les statistiques de scans sont dans votre tableau de bord.",
        benefit: 'Vous savez si votre carte est lue.',
        tiers: ALL,
      },
    ],
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: readonly FaqItem[];
}

/** FAQ dérivée de la landing. Aucune condition commerciale inventée. */
export const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    id: 'karta',
    title: 'Karta',
    items: [
      {
        q: "Qu'est-ce que Karta ?",
        a: "Le menu digital qui remplace la carte papier : un QR permanent, un menu à jour, une identité qui vous appartient.",
      },
      {
        q: 'Comment accéder à Karta ?',
        a: "L'espace de gestion se met en place avec vous. Écrivez-nous depuis la page Contact pour démarrer ou choisir une offre.",
      },
    ],
  },
  {
    id: 'qr',
    title: 'QR Code',
    items: [
      {
        q: 'Dois-je réimprimer le QR quand je change ma carte ?',
        a: "Non. Vous le collez une fois sur vos tables. Il reste valide quand vous changez un prix, retirez un plat ou refaites toute la carte.",
      },
      {
        q: 'Le QR pointe vers quoi ?',
        a: "Vers votre menu Karta. En BASIC, un menu PDF ; en PRO et PREMIUM, un menu mobile structuré.",
      },
    ],
  },
  {
    id: 'menu',
    title: 'Menu',
    items: [
      {
        q: 'Puis-je modifier mon menu quand je veux ?',
        a: "Oui, en PRO et PREMIUM : vous modifiez, vous publiez, c'est terminé. Rien n'est publié tant que vous ne l'avez pas décidé.",
      },
      {
        q: 'Le style change-t-il mes prix ou mes plats ?',
        a: "Jamais. Le contenu ne bouge pas : mêmes plats, mêmes prix. Seul le style change.",
      },
    ],
  },
  {
    id: 'import',
    title: 'Import & KartaAI',
    items: [
      {
        q: "Qu'est-ce que KartaAI fait exactement ?",
        a: "KartaAI transforme votre PDF en menu structuré. Il n'écrit pas de contenu à votre place et ne publie rien : vous relisez le résultat plat par plat, puis vous validez.",
      },
      {
        q: 'Que se passe-t-il si mon PDF est mal lu ?',
        a: "Vous corrigez à la relecture, avant publication. Le brouillon reste un brouillon tant que vous ne l'avez pas validé.",
      },
    ],
  },
  {
    id: 'personnalisation',
    title: 'Personnalisation',
    items: [
      {
        q: 'Combien de styles sont disponibles ?',
        a: "Cinq styles réels : Modern, Dark, Street Food, Minimal, Luxe. Disponibles en PRO et PREMIUM.",
      },
      {
        q: 'Puis-je mettre mes couleurs et mon logo ?',
        a: "Avec PREMIUM : nom affiché, logo, image d'en-tête, couleur principale et couleur secondaire. Le texte s'adapte pour rester lisible sur n'importe quel fond.",
      },
    ],
  },
  {
    id: 'tarifs',
    title: 'Tarifs',
    items: [
      {
        q: 'Quelles sont les offres ?',
        a: "BASIC à 29,99 €/mois, PRO à 59,99 €/mois, PREMIUM à 99,99 €/mois. Facturation annuelle : −10 %.",
      },
      {
        q: 'Comment souscrire ou changer d’offre ?',
        a: "Depuis la page Contact. Le paiement et le changement d'offre se font avec nous, pas en libre-service.",
      },
    ],
  },
];
