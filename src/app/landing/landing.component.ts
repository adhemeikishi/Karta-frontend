import { Component, inject } from '@angular/core';
import { VariantEditorialComponent } from './variants/variant-editorial.component';
import { SeoService } from '../shared/seo.service';

/**
 * Page d'accueil publique de Karta — direction « Editorial » (voir DESIGN.md),
 * retenue après comparaison de 5 directions visuelles. La navbar et le footer sont
 * posés par `PublicShellComponent` (route parente) : ce composant ne rend que le
 * contenu de la page.
 */
@Component({
  selector: 'app-landing',
  imports: [VariantEditorialComponent],
  template: '<landing-variant-editorial />',
})
export class LandingComponent {
  constructor() {
    inject(SeoService).apply({
      title: 'Le menu digital par QR code',
      description:
        "Un QR permanent, un menu à jour, publié en quelques secondes. Réimprimer sa carte à chaque changement de prix, c'est fini.",
      path: '/',
    });
  }
}
