import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { KartaLogoComponent } from '../shared/karta-logo.component';
import { LandingChromeService } from './landing-chrome.service';

/** Fin du morphing : au-delà de ce défilement (px), la navbar est pleinement compacte. */
const MORPH_DISTANCE = 96;

/**
 * Navbar du site public Karta — pleine largeur/transparente en haut de page,
 * devient une barre compacte flottante en descendant (principe du composant
 * "resizable navbar" fourni en référence, reproduit en Angular/CSS natif : aucune
 * dépendance ajoutée, aucun code React copié).
 *
 * Le morphing est un **vrai interpolateur continu** sur `scrollY` (0 → 1 sur les 96
 * premiers pixels), pas un `if scroll > x` binaire : `max-width`/`transform` sont
 * recalculés à chaque frame de scroll (le navigateur reflow de toute façon au
 * scroll — ceci n'ajoute rien de plus), tandis que `background-color`/`box-shadow`
 * gardent une micro-transition CSS pour lisser les à-coups entre deux frames.
 *
 * Navigation : Accueil / Fonctionnalités / Tarifs / FAQ / Contact — `routerLink`,
 * une page par lien. Le style de la barre est inchangé.
 */
@Component({
  selector: 'landing-nav',
  imports: [RouterLink, RouterLinkActive, KartaLogoComponent],
  templateUrl: './landing-nav.component.html',
})
export class LandingNavComponent {
  readonly mobileOpen = signal(false);

  /** Liens de navigation — source unique, réutilisés desktop + mobile. */
  readonly links = [
    { label: 'Accueil', path: '/' },
    { label: 'Fonctionnalités', path: '/features' },
    { label: 'Tarifs', path: '/pricing' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
  ] as const;

  /** 0 = tout en haut, 1 = entièrement morphée. */
  readonly progress = signal(0);

  /** Hero sombre à l'écran → navbar inversée (contenu clair, pastille charcoal). */
  readonly onDark = inject(LandingChromeService).darkHero;

  /** 72rem au repos → 60rem compacte. Le plancher reste assez large pour que la
   *  navigation complète tienne **centrée** sans jamais chevaucher le CTA. En-dessous
   *  de `lg`, la nav bascule sur le hamburger et ce plancher n'a plus d'incidence. */
  readonly shellMaxWidth = computed(() => `${72 - this.progress() * 12}rem`);
  readonly shellTranslateY = computed(() => this.progress() * 10);
  readonly shellScale = computed(() => 1 - this.progress() * 0.02);
  readonly shellBackground = computed(() =>
    this.onDark()
      ? `rgba(12, 12, 12, ${this.progress() * 0.9})`
      : `rgba(255, 255, 255, ${this.progress() * 0.85})`,
  );
  readonly shellBorderColor = computed(() =>
    this.onDark()
      ? `rgba(42, 41, 38, ${this.progress()})`
      : `rgba(230, 230, 228, ${this.progress()})`,
  );
  readonly shellShadowOpacity = computed(() => this.progress() * 0.06);
  readonly shellBlur = computed(() => `blur(${this.progress() * 14}px)`);

  /** Filet 1px + ombre portée, tous deux en `box-shadow` (aucune `border` : une
   *  bordure `border-box` décalerait le contenu de 1px). `inset` → le filet suit le
   *  border-radius et ne participe pas à la boîte. */
  readonly shellBoxShadow = computed(
    () =>
      `inset 0 0 0 1px ${this.shellBorderColor()}, 0 1px 3px rgba(19, 19, 18, ${this.shellShadowOpacity()})`,
  );

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

  /** Échap referme le menu mobile (aucun effet quand il est déjà fermé). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileOpen()) {
      this.mobileOpen.set(false);
    }
  }
}
