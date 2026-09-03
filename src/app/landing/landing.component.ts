import { Component } from '@angular/core';
import { LandingNavComponent } from './landing-nav.component';
import { LandingFooterComponent } from './landing-footer.component';
import { VariantEditorialComponent } from './variants/variant-editorial.component';

/**
 * Landing page publique de Karta — direction « Editorial » (voir DESIGN.md), retenue
 * après comparaison de 5 directions visuelles. Les 4 autres directions ont été
 * retirées ; ce composant ne fait plus que poser la nav et le footer autour du
 * contenu de la page.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [LandingNavComponent, LandingFooterComponent, VariantEditorialComponent],
  templateUrl: './landing.component.html',
})
export class LandingComponent {}
