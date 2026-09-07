import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KartaLogoComponent } from '../shared/karta-logo.component';

/** Footer du site public Karta. */
@Component({
    selector: 'landing-footer',
    imports: [RouterLink, KartaLogoComponent],
    templateUrl: './landing-footer.component.html'
})
export class LandingFooterComponent {
  readonly year = new Date().getFullYear();
}
