import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import { MenuRenderComponent } from '../landing/menu-render.component';
import {
  LANDING_MENU_PRESETS,
  resolveLandingTheme,
} from '../landing/landing-menu-presets';
import { SeoService } from '../shared/seo.service';
import { AuthService, Identity } from '../services/auth.service';
import { SignupFormComponent } from '../shared/signup-form.component';
import { CreationDraftService } from './creation-draft.service';

/**
 * `/create/compte` — créer son compte et son restaurant.
 *
 * Étape 4 du parcours de création : la carte reste affichée à côté, c'est elle qu'on
 * vient chercher. Le formulaire d'inscription lui-même est {@link SignupFormComponent},
 * partagé avec `/login` (onglet Inscription) — un seul endroit qui sait créer un compte,
 * mais chaque page garde son propre contexte : ici, l'aperçu de la carte et les
 * compteurs ; sur `/login`, la bascule avec la connexion.
 *
 * Inscription libre-service réelle (`POST /api/public/signup`, voir `AuthService.signup`) :
 * email, mot de passe, nom du restaurant. Le compte créé n'a jamais d'abonnement actif —
 * c'est `/pricing` qui prend le relais ensuite, pas cet écran.
 *
 * <strong>Le contenu de la carte n'est pas encore rattaché au compte créé</strong> — le
 * backend n'expose aucune route pour déposer une carte préparée hors session (voir
 * `CreationDraftService.attachToAccount`) ; le jour où elle existera, c'est là qu'elle
 * s'appellera, pas ici.
 */
@Component({
  selector: 'create-compte',
  standalone: true,
  imports: [CommonModule, RouterLink, PhoneFrameComponent, MenuRenderComponent, SignupFormComponent],
  template: `
    <div class="cf-design">
      <div class="min-w-0">
        <p class="eyebrow">04 · Compte</p>
        <h1 class="h2-marketing mt-3">Votre carte est prête.</h1>
        <p class="lead mt-4 max-w-md">
          Créez votre compte pour enregistrer votre carte et obtenir votre QR code. Votre
          travail reste dans cet onglet : rien n'est perdu.
        </p>

        @if (drafts.counts(); as totals) {
          <dl class="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t pt-6" style="border-color: var(--k-hairline)">
            <div>
              <dt class="eyebrow">Plats</dt>
              <dd class="mono tnum mt-1 text-xl font-semibold text-ink-900">{{ totals.items }}</dd>
            </div>
            <div>
              <dt class="eyebrow">Catégories</dt>
              <dd class="mono tnum mt-1 text-xl font-semibold text-ink-900">{{ totals.categories }}</dd>
            </div>
            <div>
              <dt class="eyebrow">Style</dt>
              <dd class="mono mt-1 text-xl font-semibold text-ink-900">{{ theme().presetLabel }}</dd>
            </div>
          </dl>
        }

        <div class="cf-block">
          <app-signup-form
            [initialRestaurantName]="drafts.draft()?.brandName ?? ''"
            (success)="onSignupSuccess($event)"
          />
        </div>

        <div class="cf-block">
          <p class="field-hint">
            Vous avez déjà un accès Karta ?
            <a routerLink="/login" [queryParams]="{ next: '/pricing' }" class="text-ink-900 underline underline-offset-4">
              Se connecter
            </a>
          </p>
        </div>

        <p class="imp-demo mt-10 max-w-md">
          @if (drafts.draft()?.sourceKind === 'uploaded') {
            Votre carte a été analysée par KartaAI. Le rattachement automatique du
            brouillon à un compte n'est pas encore en place.
          } @else {
            Démonstration : la carte affichée est un menu d'exemple, votre PDF n'a pas
            été analysé. Le rattachement automatique du brouillon à un compte n'est pas
            encore en place.
          }
        </p>
      </div>

      <div class="cf-design-preview">
        <div class="imp-phone-wrap">
          <app-phone-frame [screenColor]="theme().background">
            @if (drafts.previewMenu(); as previewMenu) {
              <menu-render [theme]="theme()" [menu]="previewMenu" />
            }
          </app-phone-frame>
        </div>
      </div>
    </div>
  `,
})
export class CompteComponent {
  readonly drafts = inject(CreationDraftService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly theme = computed(() =>
    resolveLandingTheme(
      LANDING_MENU_PRESETS.find((preset) => preset.id === this.drafts.draft()?.presetId) ??
        LANDING_MENU_PRESETS[0],
      this.drafts.draft()?.primaryColor ?? null,
      this.drafts.draft()?.secondaryColor ?? null,
    ),
  );

  constructor() {
    inject(SeoService).apply({
      title: 'Créez votre compte',
      description: 'Créez votre compte pour enregistrer votre carte et obtenir votre QR code.',
      path: '/create/compte',
    });

    // Un compte déjà connecté n'a rien à faire sur un formulaire d'inscription.
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.postAuthDestination());
    }
  }

  onSignupSuccess(identity: Identity): void {
    this.router.navigateByUrl(identity.restaurantId ? `/app/${identity.restaurantId}` : '/app');
  }

  private postAuthDestination(): string {
    const identity = this.auth.identity();
    return identity?.role === 'RESTAURATEUR' && identity.restaurantId
      ? `/app/${identity.restaurantId}`
      : '/app';
  }
}
