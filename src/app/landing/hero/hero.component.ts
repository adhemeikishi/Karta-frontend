import { Component, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingChromeService } from '../landing-chrome.service';
import { scrollToAnchor } from '../scroll-to-anchor';

/**
 * Hero de la landing — direction unique.
 *
 * Typographie capitale ivoire sur photo d'ambiance voilée :
 * « L'interface. / Reste. » puis décrochage « Le menu. / Évolue. ». « Évolue. »
 * passe à un serif éditorial italique persimmon (signature typographique).
 * Éditorial, sobre.
 *
 * Le fond : photo `hero-photo.jpg` + voile de lisibilité + vignette + fondu vers
 * la section claire, voir `.hero-panel-dark` dans styles.css — aucune animation
 * au repos.
 *
 * La navbar (transparente en haut de page) s'inverse sur ce fond sombre via
 * `LandingChromeService.darkHero`, actif tant que ce composant est monté.
 */
@Component({
  selector: 'landing-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero.component.html',
})
export class HeroComponent implements OnDestroy {
  readonly scrollToAnchor = scrollToAnchor;

  private readonly chrome = inject(LandingChromeService);

  constructor() {
    this.chrome.darkHero.set(true);
  }

  ngOnDestroy(): void {
    // Quitter la landing rend sa navbar normale.
    this.chrome.darkHero.set(false);
  }
}
