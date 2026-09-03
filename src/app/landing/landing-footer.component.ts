import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { scrollToAnchor } from './scroll-to-anchor';

/** Footer de la landing page Karta. */
@Component({
  selector: 'landing-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-footer.component.html',
})
export class LandingFooterComponent {
  readonly year = new Date().getFullYear();
  readonly scrollToAnchor = scrollToAnchor;
}
