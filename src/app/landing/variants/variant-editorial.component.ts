import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LANDING_CAPABILITIES } from '../landing-offers';
import { HeroComponent } from '../hero/hero.component';
import { LandingPricingComponent } from '../landing-pricing.component';
import { KartaPayTeaserComponent } from '../karta-pay-teaser.component';
import { MenuImportDropzoneComponent } from '../import-experience/menu-import-dropzone.component';
import { RevealOnScrollDirective } from '../reveal-on-scroll.directive';
import { FaqAccordionComponent } from '../../public/faq-accordion.component';
import { FAQ_GROUPS } from '../../public/public-content';

/** Groupes de la FAQ reportés sur la landing, dans l'ordre du parcours. */
const LANDING_FAQ_GROUP_IDS = ['import', 'menu', 'qr', 'tarifs'] as const;

type LandingCapabilityIcon =
  | 'qr'
  | 'stats'
  | 'menu'
  | 'ai'
  | 'sliders'
  | 'qr-custom'
  | 'no-tag'
  | 'photo'
  | 'globe'
  | 'type';

interface LandingCapabilityCard {
  /** Doit correspondre mot pour mot à une entrée de `LANDING_CAPABILITIES`
   *  (landing-offers.ts) — source unique, jamais réinventée ici. */
  readonly label: (typeof LANDING_CAPABILITIES)[number];
  readonly description: string;
  readonly icon: LandingCapabilityIcon;
}

/**
 * Landing Karta — le funnel EST la page.
 *
 * Le chapitre `01 · Votre menu` est interactif : il *montre* la transformation
 * au lieu de la décrire ({@link MenuImportDropzoneComponent} puis `/karta-ai`).
 * Suivent le teaser Karta Pay (direction future, rien de livré), la grille des
 * capacités du produit, puis FAQ et abonnement, une fois la valeur démontrée.
 *
 * Aucune donnée produit inventée : capacités, prix et FAQ viennent des sources
 * de vérité existantes (`landing-offers.ts`, `public-content.ts`).
 */
@Component({
    selector: 'landing-variant-editorial',
    imports: [
        RouterLink,
        HeroComponent,
        MenuImportDropzoneComponent,
        KartaPayTeaserComponent,
        LandingPricingComponent,
        FaqAccordionComponent,
        RevealOnScrollDirective,
    ],
    templateUrl: './variant-editorial.component.html'
})
export class VariantEditorialComponent {
  /** FAQ de la landing — extraite de `FAQ_GROUPS` (source de `/faq`), pas réécrite. */
  readonly faq = LANDING_FAQ_GROUP_IDS.flatMap(
    (id) => FAQ_GROUPS.find((group) => group.id === id)?.items ?? [],
  );

  /** Grille « Voilà ce qu'il fait » — labels alignés sur `LANDING_CAPABILITIES`
   *  (le compilateur signale toute divergence), description courte + icône
   *  ajoutées pour ce format de carte. */
  readonly capabilityCards: readonly LandingCapabilityCard[] = [
    {
      label: 'QR unique et permanent',
      description: 'Un seul code, scanné à vie, jamais réimprimé.',
      icon: 'qr',
    },
    {
      label: 'Statistiques de scans',
      description: 'Combien de personnes consultent votre carte, et quand.',
      icon: 'stats',
    },
    {
      label: 'Menu structuré (éditeur + 5 styles)',
      description: 'Catégories, plats et prix organisés, cinq styles au choix.',
      icon: 'menu',
    },
    {
      label: 'KartaIA — import PDF assisté',
      description: 'Déposez votre PDF, Karta l’organise en carte structurée.',
      icon: 'ai',
    },
    {
      label: 'Personnalisation visuelle complète',
      description: 'Nom, logo, couleurs, image d’en-tête : votre identité.',
      icon: 'sliders',
    },
    {
      label: 'QR code personnalisable',
      description: 'Vos couleurs et votre style, jusque sur le QR.',
      icon: 'qr-custom',
    },
    {
      label: 'Sans branding Karta',
      description: 'Votre carte affiche votre nom, jamais le nôtre.',
      icon: 'no-tag',
    },
    {
      label: 'Photos des plats',
      description: 'Chaque plat illustré, pour donner envie avant de commander.',
      icon: 'photo',
    },
    {
      label: 'Carte multilingue — FR / EN / ES / 中文',
      description: 'Une carte, plusieurs langues, pour tous vos clients.',
      icon: 'globe',
    },
    {
      label: 'Typographies personnalisées',
      description: 'Le choix de la police, jusque dans les moindres détails.',
      icon: 'type',
    },
  ];
}
