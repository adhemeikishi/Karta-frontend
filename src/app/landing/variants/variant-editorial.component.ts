import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LANDING_MENU_CONTENT,
  LANDING_MENU_PRESETS,
  LandingMenuPresetId,
  resolveLandingTheme,
} from '../landing-menu-presets';
import { HeroComponent } from '../hero/hero.component';
import { LandingPricingComponent } from '../landing-pricing.component';
import { MenuRenderComponent } from '../menu-render.component';
import { PhoneFrameComponent } from '../../menu/design/phone-frame.component';
import { PremiumConfiguratorComponent } from '../premium-configurator.component';
import { RevealOnScrollDirective } from '../reveal-on-scroll.directive';
import { scrollToAnchor } from '../scroll-to-anchor';

interface LandingWorkflowStep {
  label: string;
  detail: string;
}

/**
 * Landing Karta — V2 Art Direction.
 *
 * Chaque section a une composition distincte (manifeste, transformation, showcase
 * produit, configurateur, respiration, démo QR, avant/après, pricing, clôture) :
 * la cohérence vient de la typographie, de l'air et du traitement du produit, jamais
 * de la répétition d'un gabarit. Signature graphique rationnée : `.k-ticks` = le
 * ruban de process (une fois), `.k-crosshair` = la section QR (une fois).
 *
 * Aucune donnée produit inventée : presets, prix et contenu de menu viennent des
 * sources de vérité existantes (`landing-menu-presets.ts`, `landing-offers.ts`).
 */
@Component({
    selector: 'landing-variant-editorial',
    imports: [
        RouterLink,
        HeroComponent,
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

  /** 5 presets réels — miroir de MenuPreset.java (voir landing-menu-presets.ts). */
  readonly presets = LANDING_MENU_PRESETS;
  /** Contenu de démonstration — forme identique à PublicMenuDtos.PublicMenu. */
  readonly content = LANDING_MENU_CONTENT;

  /** Preset choisi dans le showcase (#produit) — reflété par le téléphone du hero
   *  ET celui du showcase. Le configurateur #premium a son propre état, indépendant. */
  readonly activePresetId = signal<LandingMenuPresetId>('modern');

  selectPreset(id: LandingMenuPresetId): void {
    this.activePresetId.set(id);
  }

  /** Thème résolu du preset actif — même résolveur que le rendu réel
   *  (`resolveLandingTheme` = port de `MenuThemeResolver`), aucune couleur imposée. */
  readonly activePresetTheme = computed(() =>
    resolveLandingTheme(
      this.presets.find((p) => p.id === this.activePresetId()) ?? this.presets[0],
      null,
      null,
    ),
  );

  /** Aperçu « menu structuré » (section Transformation) : 2 lignes par catégorie,
   *  dérivé de LANDING_MENU_CONTENT — jamais un contenu inventé. */
  readonly structuredPreview = LANDING_MENU_CONTENT.categories.map((category) => ({
    name: category.name,
    items: category.items.slice(0, 2),
  }));

  /** Parcours réel : PDF → extraction → Review manuelle → preset → aperçu →
   *  publication explicite. Aligné sur le pipeline backend (kartaai, menu_drafts). */
  readonly kartaAiWorkflow: readonly LandingWorkflowStep[] = [
    { label: 'PDF', detail: 'Votre menu actuel' },
    { label: 'KartaAI', detail: 'Extraction et structuration' },
    { label: 'Review', detail: 'Vous validez chaque plat' },
    { label: 'Preset', detail: 'Vous choisissez le style' },
    { label: 'Aperçu', detail: 'Le rendu, avant publication' },
    { label: 'Publication', detail: 'En ligne, accessible par QR' },
  ];
}
