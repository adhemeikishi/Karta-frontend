import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import { MenuRenderComponent } from '../landing/menu-render.component';
import {
  LANDING_MENU_PRESETS,
  resolveLandingTheme,
} from '../landing/landing-menu-presets';
import { SeoService } from '../shared/seo.service';
import { AuthService } from '../services/auth.service';
import { CreationDraftService } from './creation-draft.service';

/**
 * `/create/compte` — créer son compte et son restaurant.
 *
 * Inscription libre-service réelle (`POST /api/public/signup`, voir `AuthService.signup`) :
 * email, mot de passe, nom du restaurant. Le compte créé n'a jamais d'abonnement actif —
 * c'est `/pricing` qui prend le relais ensuite, pas cet écran.
 *
 * La carte reste affichée à côté : c'est elle qu'on vient chercher. <strong>Son contenu
 * n'est pas encore rattaché au compte créé</strong> — le backend n'expose aucune route pour
 * déposer une carte préparée hors session (voir `CreationDraftService.attachToAccount`) ;
 * le jour où elle existera, c'est là qu'elle s'appellera, pas ici.
 */
@Component({
  selector: 'create-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PhoneFrameComponent, MenuRenderComponent],
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

        <form (ngSubmit)="submit()" class="cf-block space-y-4">
          <div>
            <label class="field-label" for="signup-restaurant-name">Nom du restaurant</label>
            <input
              id="signup-restaurant-name"
              type="text"
              name="restaurantName"
              [(ngModel)]="restaurantName"
              autocomplete="organization"
              class="input"
            />
          </div>

          <div>
            <label class="field-label" for="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              [(ngModel)]="email"
              autocomplete="email"
              class="input"
            />
          </div>

          <div>
            <label class="field-label" for="signup-password">Mot de passe</label>
            <input
              id="signup-password"
              type="password"
              name="password"
              [(ngModel)]="password"
              autocomplete="new-password"
              class="input"
            />
            <p class="field-hint">Au moins 8 caractères.</p>
          </div>

          <div>
            <label class="field-label" for="signup-password-confirm">Confirmer le mot de passe</label>
            <input
              id="signup-password-confirm"
              type="password"
              name="passwordConfirm"
              [(ngModel)]="passwordConfirm"
              autocomplete="new-password"
              class="input"
            />
          </div>

          @if (errorMessage()) {
            <p class="alert-error">{{ errorMessage() }}</p>
          }

          <button type="submit" [disabled]="loading()" class="btn btn-primary w-full">
            {{ loading() ? 'Création…' : 'Créer mon compte' }}
          </button>
        </form>

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

  restaurantName = this.drafts.draft()?.brandName ?? '';
  email = '';
  password = '';
  passwordConfirm = '';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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

  submit(): void {
    if (!this.restaurantName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage.set('Tous les champs sont requis.');
      return;
    }
    if (this.password.length < 8) {
      this.errorMessage.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.errorMessage.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.signup(this.email, this.password, this.restaurantName).subscribe({
      next: () => {
        // Connexion immédiate avec les identifiants qui viennent d'être créés — mêmes
        // deux étapes qu'une connexion normale (vérifier, puis stocker).
        this.auth.verifyCredentials(this.email, this.password).subscribe({
          next: (identity) => {
            this.auth.setCredentials(this.email, this.password, identity);
            this.loading.set(false);
            this.router.navigateByUrl(
              identity.restaurantId ? `/app/${identity.restaurantId}` : '/app',
            );
          },
          error: () => {
            this.loading.set(false);
            // Le compte est bien créé : seule la connexion automatique a échoué.
            this.errorMessage.set('Compte créé. Connectez-vous pour continuer.');
            this.router.navigate(['/login']);
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 409) {
          this.errorMessage.set('Un compte existe déjà avec cet email.');
        } else if (err?.status === 400) {
          this.errorMessage.set(err?.error?.message ?? 'Vérifiez les informations saisies.');
        } else {
          this.errorMessage.set('Impossible de contacter le serveur Karta.');
        }
      },
    });
  }

  private postAuthDestination(): string {
    const identity = this.auth.identity();
    return identity?.role === 'RESTAURATEUR' && identity.restaurantId
      ? `/app/${identity.restaurantId}`
      : '/app';
  }
}
