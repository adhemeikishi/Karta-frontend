import { Component, input } from '@angular/core';
import { LANDING_MENU_CONTENT, LandingMenuPreset } from './landing-menu-presets';

/**
 * Aperçu statique d'un menu Karta, pilotable par preset (voir landing-menu-presets.ts).
 * Volontairement **statique** — pas d'iframe vers le rendu public réel
 * (`MenuRenderer`) : la landing ne dépend d'aucune donnée restaurant existante. Le
 * studio de style (`menu-design-studio`) reste la seule source de vérité de l'aperçu
 * réel (voir DESIGN.md §12) ; ceci n'est qu'une illustration marketing — mais avec un
 * seul contenu réel, rendu par les 5 presets réels, exactement comme en production.
 */
@Component({
  selector: 'landing-menu-mock',
  standalone: true,
  templateUrl: './landing-menu-mock.component.html',
})
export class LandingMenuMockComponent {
  readonly preset = input.required<LandingMenuPreset>();
  /** Bref état de transition pendant un changement de preset — voir variant-editorial. */
  readonly switching = input(false);
  readonly content = LANDING_MENU_CONTENT;

  /**
   * Overrides PREMIUM (voir `MenuDesign.java` : brandName/logo/heroAsset) — jamais
   * utilisés par la galerie de styles (#produit), seulement par l'illustration
   * PREMIUM (#premium). Par défaut, comportement inchangé.
   */
  readonly brandName = input<string>();
  readonly logoInitial = input<string>();
  readonly heroImage = input(false);
}
