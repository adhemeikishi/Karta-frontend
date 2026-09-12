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
      title: 'Carte digitale pour restaurant, sans réimpression',
      description:
        "Karta transforme la carte de votre restaurant en menu digital, toujours à jour. Modifiez vos plats et vos prix sans réimprimer : votre QR code reste le même.",
      path: '/',
    });
  }
}
