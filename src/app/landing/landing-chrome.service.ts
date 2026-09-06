import { Injectable, signal } from '@angular/core';

/**
 * État de chrome partagé entre la navbar de la landing et le hero.
 *
 * `darkHero` : le hero actif est rendu sur une surface sombre (variante D). La
 * navbar est transparente en haut de page — sur fond sombre elle doit inverser son
 * contenu (logo clair, liens clairs) et, une fois compacte, flotter en pastille
 * charcoal plutôt que blanche. Faux pour toutes les autres variantes : la navbar
 * garde exactement son comportement d'origine.
 */
@Injectable({ providedIn: 'root' })
export class LandingChromeService {
  readonly darkHero = signal(false);
}
