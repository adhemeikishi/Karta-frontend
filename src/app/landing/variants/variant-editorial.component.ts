import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PhoneFrameComponent } from '../../menu/design/phone-frame.component';
import { LandingMenuMockComponent } from '../landing-menu-mock.component';
import {
  LANDING_MENU_CONTENT,
  LANDING_MENU_PRESETS,
  LandingMenuPreset,
  LandingMenuPresetId,
} from '../landing-menu-presets';
import { LandingPricingComponent } from '../landing-pricing.component';
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
  standalone: true,
  imports: [
    RouterLink,
    PhoneFrameComponent,
    LandingMenuMockComponent,
    LandingPricingComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './variant-editorial.component.html',
})
export class VariantEditorialComponent {
  readonly scrollToAnchor = scrollToAnchor;

  /** Un seul téléphone, 5 états — jamais 5 téléphones (voir §5 du brief). */
  readonly presets = LANDING_MENU_PRESETS;
  /** Noms de catégories réels, réutilisés (jamais dupliqués) pour les miniatures de la
   *  galerie de styles — jamais les plats/prix, qui restent exclusifs au téléphone. */
  readonly content = LANDING_MENU_CONTENT;
  /** État de sélection de la galerie de styles — aucun téléphone ne le reflète (le
   *  téléphone du produit a été retiré ; celui de #premium reste sur son propre style
   *  fixe, `premiumPreset`, indépendant de ce choix). */
  readonly activePresetId = signal<LandingMenuPresetId>('modern');

  selectPreset(id: LandingMenuPresetId): void {
    this.activePresetId.set(id);
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

  /**
   * Illustration PREMIUM (#premium) — jamais un 6e preset. Base = densité/typo du
   * preset "Modern", mais fond/accent/texte remplacés pour représenter un exemple de
   * couleurs choisies par le client (`primaryColor`/`secondaryColor` réels de
   * `MenuDesign.java`), volontairement hors des 5 palettes de presets ci-dessus pour
   * qu'on ne les confonde jamais.
   */
  readonly premiumPreset: LandingMenuPreset = {
    id: 'modern',
    label: 'Identité personnalisée',
    background: '#F5F1E8',
    accent: '#0F5132',
    text: '#131312',
    divider: 'rgba(19, 19, 18, 0.12)',
    density: 'editorial',
    typeface: 'sans',
  };

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
