import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import { MenuRenderComponent } from '../landing/menu-render.component';
import {
  LANDING_MENU_PRESETS,
  resolveLandingTheme,
} from '../landing/landing-menu-presets';
import { SeoService } from '../shared/seo.service';
import { CreationDraftService } from './creation-draft.service';

/**
 * `/create/compte` — rattacher la carte à un compte.
 *
 * <strong>Il n'existe pas d'inscription en libre-service chez Karta.</strong> Le
 * backend n'expose aucune route de création de compte : l'accès se met en place avec
 * l'équipe (voir la FAQ publique). Cet écran ne fabrique donc pas un formulaire
 * d'inscription qui ne mènerait nulle part — il propose les deux chemins réels : se
 * connecter, ou demander un accès.
 *
 * La carte reste affichée à côté : c'est elle qu'on vient chercher, et elle n'est pas
 * perdue. Le brouillon vit dans la session de l'onglet et survit à la connexion.
 */
@Component({
  selector: 'create-compte',
  standalone: true,
  imports: [RouterLink, PhoneFrameComponent, MenuRenderComponent],
  template: `
    <div class="cf-design">
      <div class="min-w-0">
        <p class="eyebrow">04 · Compte</p>
        <h1 class="h2-marketing mt-3">Votre carte est prête.</h1>
        <p class="lead mt-4 max-w-md">
          Connectez-vous pour enregistrer votre carte et obtenir votre QR code. Votre
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
          <a routerLink="/login" [queryParams]="{ next: '/pricing' }" class="btn btn-primary">
            Se connecter
          </a>
          <p class="field-hint">Vous avez déjà un accès Karta.</p>
        </div>

        <div class="cf-block">
          <p class="text-lg font-bold tracking-[-0.015em] text-ink-900">Pas encore de compte ?</p>
          <p class="lead mt-2 max-w-md">
            L'accès à l'espace de gestion se met en place avec nous : écrivez-nous, on
            ouvre votre compte et on y rattache la carte que vous venez de préparer.
          </p>
          <a routerLink="/contact" class="btn btn-outline mt-5">Demander un accès</a>
        </div>

        <p class="imp-demo mt-10 max-w-md">
          Démonstration : la carte affichée est un menu d'exemple, votre PDF n'a pas été
          analysé. Le rattachement automatique du brouillon à un compte n'est pas encore
          en place.
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
      title: 'Enregistrez votre carte',
      description: 'Connectez-vous pour enregistrer votre carte et obtenir votre QR code.',
      path: '/create/compte',
    });
  }
}
