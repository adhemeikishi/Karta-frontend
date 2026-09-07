import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LandingNavComponent } from '../landing/landing-nav.component';
import { LandingFooterComponent } from '../landing/landing-footer.component';

/**
 * Châssis des pages publiques de Karta (`/`, `/pricing`, `/features`, `/faq`,
 * `/contact`). Pose la navbar et le footer — strictement ceux de la landing,
 * inchangés — autour d'un `<router-outlet>`.
 *
 * La navbar s'inverse sur fond sombre via `LandingChromeService.darkHero` : seul
 * le hero de la landing le passe à `true` (à son montage), donc toutes les autres
 * pages gardent la navbar claire sans rien avoir à faire.
 */
@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, LandingNavComponent, LandingFooterComponent],
  template: `
    <div class="min-h-[100dvh] bg-white">
      <landing-nav />
      <main><router-outlet /></main>
      <landing-footer />
    </div>
  `,
})
export class PublicShellComponent {}
