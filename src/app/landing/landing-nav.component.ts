import { Component, HostListener, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { scrollToAnchor } from './scroll-to-anchor';

/** Fin du morphing : au-delà de ce défilement (px), la navbar est pleinement compacte. */
const MORPH_DISTANCE = 96;

/**
 * Navbar de la landing page Karta — pleine largeur/transparente en haut de page,
 * devient une barre compacte flottante en descendant (principe du composant
 * "resizable navbar" fourni en référence, reproduit en Angular/CSS natif : aucune
 * dépendance ajoutée, aucun code React copié).
 *
 * Le morphing est un **vrai interpolateur continu** sur `scrollY` (0 → 1 sur les 96
 * premiers pixels), pas un `if scroll > x` binaire : `max-width`/`transform` sont
 * recalculés à chaque frame de scroll (le navigateur reflow de toute façon au
 * scroll — ceci n'ajoute rien de plus), tandis que `background-color`/`box-shadow`
 * gardent une micro-transition CSS pour lisser les à-coups entre deux frames.
 */
@Component({
  selector: 'landing-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-nav.component.html',
})
export class LandingNavComponent {
  readonly scrollToAnchor = scrollToAnchor;
  readonly mobileOpen = signal(false);

  /** 0 = tout en haut, 1 = entièrement morphée. */
  readonly progress = signal(0);

  readonly shellMaxWidth = computed(() => `${72 - this.progress() * 26}rem`);
  readonly shellTranslateY = computed(() => this.progress() * 10);
  readonly shellScale = computed(() => 1 - this.progress() * 0.02);
  readonly shellBackground = computed(() => `rgba(255, 255, 255, ${this.progress() * 0.85})`);
  readonly shellBorderColor = computed(() => `rgba(230, 230, 228, ${this.progress()})`);
  readonly shellShadowOpacity = computed(() => this.progress() * 0.06);
  readonly shellBlur = computed(() => `blur(${this.progress() * 14}px)`);

  private ticking = false;

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.ticking) {
      return;
    }
    this.ticking = true;
    requestAnimationFrame(() => {
      const p = Math.min(1, Math.max(0, window.scrollY / MORPH_DISTANCE));
      this.progress.set(p);
      this.ticking = false;
    });
  }

  toggleMobileMenu(): void {
    this.mobileOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
  }

  /** Ferme le menu mobile avant de défiler — sinon le panneau reste ouvert au-dessus de la section visée. */
  navigateAndClose(id: string, event: MouseEvent): void {
    this.closeMobileMenu();
    scrollToAnchor(id, event);
  }
}
