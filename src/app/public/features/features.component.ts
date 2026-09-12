import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../../landing/reveal-on-scroll.directive';
import { LANDING_MENU_PRESETS } from '../../landing/landing-menu-presets';
import { FEATURE_GROUPS } from '../public-content';
import { SeoService } from '../../shared/seo.service';

/**
 * Page `/features` — extension de la landing, pas une nouvelle présentation de
 * Karta. Reprend les fonctionnalités déjà montrées dans les sections `/`
 * (`FEATURE_GROUPS`, vérifiées contre le code produit) et les 5 presets réels
 * (`LANDING_MENU_PRESETS`, miroir de `MenuPreset.java`).
 */
@Component({
  selector: 'app-features',
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './features.component.html',
})
export class FeaturesComponent {
  readonly groups = FEATURE_GROUPS;
  readonly presets = LANDING_MENU_PRESETS;

  constructor() {
    inject(SeoService).apply({
      title: 'Fonctionnalités',
      description:
        'QR permanent, menu structuré, KartaIA pour importer votre PDF, 5 styles, personnalisation visuelle et statistiques de scans.',
      path: '/features',
    });
  }
}
