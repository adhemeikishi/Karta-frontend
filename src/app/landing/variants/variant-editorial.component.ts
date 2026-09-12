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
import { MenuImportDropzoneComponent } from '../import-experience/menu-import-dropzone.component';
import { RevealOnScrollDirective } from '../reveal-on-scroll.directive';
import { FaqAccordionComponent } from '../../public/faq-accordion.component';
import { FAQ_GROUPS } from '../../public/public-content';

/** Groupes de la FAQ reportés sur la landing, dans l'ordre du parcours. */
const LANDING_FAQ_GROUP_IDS = ['import', 'menu', 'qr', 'tarifs'] as const;

/**
 * Landing Karta — le funnel EST la page.
 *
 * Trois chapitres numérotés portent le parcours réel du restaurateur : `01` son menu
 * — le dépôt du PDF, qui ouvre le parcours de création
 * ({@link MenuImportDropzoneComponent} puis `/karta-ai`) —, `02` le style, `03` la publication.
 * Puis l'abonnement, une fois la valeur démontrée. Les repères `01 · …`
 * (`.eyebrow`, Geist Mono) sont les mêmes que ceux de l'onboarding réel
 * (`import.component.html`, `publish.component.ts`).
 *
 * Chaque chapitre garde sa composition propre (expérience interactive, sélecteur +
 * téléphone, démo QR sur charcoal) : la cohérence vient de la typographie, de l'air
 * et du traitement du produit — jamais d'un gabarit répété.
 *
 * Aucune donnée produit inventée : presets, prix, contenu de menu, compteurs et FAQ
 * viennent des sources de vérité existantes (`landing-menu-presets.ts`,
 * `landing-offers.ts`, `public-content.ts`).
 */
@Component({
    selector: 'landing-variant-editorial',
    imports: [
        RouterLink,
        HeroComponent,
        MenuRenderComponent,
        PhoneFrameComponent,
        PremiumConfiguratorComponent,
        MenuImportDropzoneComponent,
        LandingPricingComponent,
        FaqAccordionComponent,
        RevealOnScrollDirective,
    ],
    templateUrl: './variant-editorial.component.html'
})
export class VariantEditorialComponent {
  /** 5 presets réels — miroir de MenuPreset.java (voir landing-menu-presets.ts). */
  readonly presets = LANDING_MENU_PRESETS;
  /** Contenu de démonstration — forme identique à PublicMenuDtos.PublicMenu. */
  readonly content = LANDING_MENU_CONTENT;

  /** Preset choisi au chapitre 02 — reflété par le téléphone du sélecteur. Le
   *  configurateur PREMIUM a son propre état, indépendant. */
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

  /** FAQ de la landing — extraite de `FAQ_GROUPS` (source de `/faq`), pas réécrite. */
  readonly faq = LANDING_FAQ_GROUP_IDS.flatMap(
    (id) => FAQ_GROUPS.find((group) => group.id === id)?.items ?? [],
  );
}
