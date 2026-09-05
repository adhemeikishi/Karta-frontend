import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LANDING_MENU_CONTENT,
  LANDING_MENU_PRESETS,
  LandingMenuPreset,
  LandingMenuPresetId,
  mix,
  resolveLandingTheme,
} from '../landing-menu-presets';
import { LandingPricingComponent } from '../landing-pricing.component';
import { MenuRenderComponent } from '../menu-render.component';
import { PhoneFrameComponent } from '../../menu/design/phone-frame.component';
import { PremiumConfiguratorComponent } from '../premium-configurator.component';
import { RevealOnScrollDirective } from '../reveal-on-scroll.directive';
import { scrollToAnchor } from '../scroll-to-anchor';

interface LandingFeature {
  id: 'qr' | 'edit' | 'identity';
  title: string;
  /** Situation « carte papier » — le problème. */
  before: string;
  /** Situation « Karta » — la résolution. */
  after: string;
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
        MenuRenderComponent,
        PhoneFrameComponent,
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
  /** État de sélection de la galerie de styles (#produit) — reflété en direct par le
   *  téléphone de la section via {@link activePresetTheme}. Le configurateur #premium a
   *  son propre état, indépendant. */
  readonly activePresetId = signal<LandingMenuPresetId>('modern');

  selectPreset(id: LandingMenuPresetId): void {
    this.activePresetId.set(id);
  }

  /** Thème résolu du preset sélectionné (#produit) — même résolveur que le rendu réel
   *  (`resolveLandingTheme` = port de `MenuThemeResolver`), aucune couleur imposée :
   *  changer de preset se voit immédiatement dans le téléphone. */
  readonly activePresetTheme = computed(() =>
    resolveLandingTheme(
      this.presets.find((p) => p.id === this.activePresetId()) ?? this.presets[0],
      null,
      null,
    ),
  );

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

  /** Étape 02 — aperçu « menu structuré » : les mêmes catégories/plats réels que le
   *  reste de la landing, réduits à 2 lignes par catégorie. Jamais un contenu
   *  inventé — dérivé de LANDING_MENU_CONTENT. */
  readonly structuredPreview = LANDING_MENU_CONTENT.categories.map((category) => ({
    name: category.name,
    items: category.items.slice(0, 2),
  }));

  /** Champs extraits automatiquement par KartaAI, affichés en puces « extraites ». */
  readonly kartaAiExtracted: readonly string[] = ['Catégories', 'Plats', 'Descriptions', 'Prix'];

  /** Section « Le QR » — faits vérifiables (voir QrImageGenerator backend, MenuService). */
  readonly qrPoints: readonly string[] = [
    'Export en PNG, SVG et version imprimable',
    'La mention kartaqr.fr est ajoutée automatiquement sous chaque QR',
    'La destination se met à jour toute seule à chaque publication',
  ];

  /** « Pourquoi Karta » — présenté en avant / après (carte papier → Karta). Chaque
   *  bénéfice correspond à une capacité réellement livrée (voir DESIGN.md §14). */
  readonly features: readonly LandingFeature[] = [
    {
      id: 'qr',
      title: 'Un seul QR, pour toujours',
      before: 'Le QR change à chaque version du menu : réimprimer, redécouper, recoller sur chaque table.',
      after: 'Le QR est imprimé une seule fois. Seul son contenu évolue — jamais le sticker.',
    },
    {
      id: 'edit',
      title: 'Modifications instantanées',
      before: 'Changer un prix ou retirer un plat en rupture : réimprimer, puis remplacer toutes les cartes. Des jours.',
      after: 'Modifier le prix → publier → terminé. Quelques secondes, à jour pour tout le monde.',
    },
    {
      id: 'identity',
      title: 'Une identité, pas un gabarit',
      before: 'Un menu générique ne ressemble à aucun restaurant en particulier.',
      after: '5 styles prêts à l’emploi, et en Premium votre logo, vos couleurs et votre image d’en-tête.',
    },
  ];
}
