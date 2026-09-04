import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LANDING_MENU_CONTENT,
  LANDING_MENU_PRESETS,
  LandingMenuPreset,
  LandingMenuPresetId,
  mix,
} from '../landing-menu-presets';
import { LandingPricingComponent } from '../landing-pricing.component';
import { PremiumConfiguratorComponent } from '../premium-configurator.component';
import { RevealOnScrollDirective } from '../reveal-on-scroll.directive';
import { scrollToAnchor } from '../scroll-to-anchor';

interface LandingFeature {
  id: 'qr' | 'edit' | 'identity';
  title: string;
  problem: string;
  benefit: string;
}

interface LandingStep {
  title: string;
  detail: string;
}

interface LandingWorkflowStep {
  label: string;
  detail: string;
}

/**
 * Variante 04 — Editorial (direction retenue, voir DESIGN.md) : composition
 * asymétrique, grande typographie, chiffres techniques en Geist Mono, lignes fines
 * (`.k-ticks`) comme séparateurs. Pas de brutalisme : la lisibilité reste
 * prioritaire. Fonctionnalités/étapes alignées sur le produit réel — aucune
 * n'est inventée (voir DESIGN.md §13, docs/MENU_STRUCTURED.md).
 */
@Component({
    selector: 'landing-variant-editorial',
    imports: [
        RouterLink,
        PremiumConfiguratorComponent,
        LandingPricingComponent,
        RevealOnScrollDirective,
    ],
    templateUrl: './variant-editorial.component.html'
})
export class VariantEditorialComponent {
  readonly scrollToAnchor = scrollToAnchor;

  /** Un seul téléphone, 5 états — jamais 5 téléphones (voir §5 du brief). */
  readonly presets = LANDING_MENU_PRESETS;
  /** Noms de catégories réels, réutilisés (jamais dupliqués) pour les miniatures de la
   *  galerie de styles — jamais les plats/prix, qui restent exclusifs au téléphone. */
  readonly content = LANDING_MENU_CONTENT;
  /** État de sélection de la galerie de styles (#produit) — aucun téléphone ne le
   *  reflète ; le configurateur #premium a son propre état, indépendant. */
  readonly activePresetId = signal<LandingMenuPresetId>('modern');

  selectPreset(id: LandingMenuPresetId): void {
    this.activePresetId.set(id);
  }

  /** Fond des puces de catégorie dans la galerie de styles — même formule de filet
   *  que le renderer (`mix(background, text, 0.16)`), calculée ici pour l'aperçu réduit. */
  chipColor(p: LandingMenuPreset): string {
    return mix(p.background, p.text, 0.14);
  }

  /** Workflow KartaAI réel : PDF → extraction/structuration → Review (validation
   *  manuelle, jamais automatique) → choix du preset → aperçu réel → publication
   *  explicite. Aligné sur le pipeline backend réel (kartaai, menu_drafts, Review) —
   *  aucune étape inventée. */
  readonly kartaAiWorkflow: readonly LandingWorkflowStep[] = [
    { label: 'PDF', detail: 'Votre menu existant' },
    { label: 'KartaAI', detail: 'Extraction et structuration' },
    { label: 'Review', detail: 'Vous vérifiez le résultat' },
    { label: 'Preset', detail: 'Choisissez votre design' },
    { label: 'Aperçu', detail: 'Visualisez avant publication' },
    { label: 'Publication', detail: 'Votre menu est en ligne' },
  ];

  /** Illustration de la Review KartaAI : quelques plats déjà validés (aperçu),
   *  un plat en cours de validation. Purement démonstratif — la vraie Review vit
   *  dans menu-review.component (voir docs/MENU_STRUCTURED.md). */
  readonly kartaAiValidatedDishes: readonly string[] = ['Burrata crémeuse', 'Pasta Truffe'];

  readonly features: readonly LandingFeature[] = [
    {
      id: 'qr',
      title: 'Un seul QR, pour toujours',
      problem: 'Un QR qui change à chaque mise à jour oblige à tout réimprimer et recoller.',
      benefit: 'Imprimé une fois, il reste valide indéfiniment — seul son contenu évolue.',
    },
    {
      id: 'edit',
      title: 'Modifications instantanées',
      problem: "Changer un prix ou retirer un plat en rupture prend des jours avec une carte imprimée.",
      benefit: 'Enregistré en quelques secondes, publié uniquement quand vous le décidez.',
    },
    {
      id: 'identity',
      title: 'Une identité, pas un gabarit',
      problem: 'Un menu générique ne ressemble à aucun restaurant en particulier.',
      benefit: '5 styles de présentation, et en Premium, votre logo et vos couleurs.',
    },
  ];

  readonly steps: readonly LandingStep[] = [
    { title: 'Créez votre menu', detail: 'Catégories, plats, prix : votre carte, structurée.' },
    { title: 'Personnalisez Karta', detail: 'Choisissez un style, ou composez votre identité (Premium).' },
    { title: 'Affichez votre QR', detail: 'Un seul QR, généré automatiquement, permanent.' },
    { title: 'Vos clients consultent le menu', detail: 'Sur leur téléphone, à jour à la seconde.' },
  ];
}
