import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuDesignStudioComponent } from '../menu/design/menu-design-studio.component';
import { Menu } from '../menu/menu.model';
import { OnboardingService } from './onboarding.service';

/**
 * Étape 04 — le style de la carte.
 *
 * Monte le studio du back-office tel quel : mêmes cinq presets, venus du serveur, même
 * aperçu (le HTML réel du renderer, dans un châssis de téléphone). En construire un
 * second garantirait qu'ils divergent, et l'aperçu mentirait.
 *
 * Le studio porte aussi « Publier » ; ici c'est l'étape suivante qui s'en charge, avec
 * une confirmation explicite. Enregistrer un style ne met donc rien en ligne.
 */
@Component({
  selector: 'app-onboarding-style',
  imports: [MenuDesignStudioComponent],
  template: `
    <p class="eyebrow">04</p>
    <h1 class="page-title mt-2 text-[1.6rem] sm:text-[1.75rem]">Choisissez votre style</h1>
    <p class="lead mt-3 max-w-lg">
      Votre carte, vos prix et vos photos ne changent pas — seule la présentation évolue.
      L'aperçu à droite est le rendu réel, celui que vos clients verront.
    </p>

    @if (onboarding.loading()) {
      <div class="card card-pad mt-8 space-y-4">
        <div class="skeleton h-5 w-32"></div>
        <div class="skeleton h-40 w-full"></div>
      </div>
    } @else if (onboarding.error()) {
      <div class="card card-pad mt-8">
        <p class="alert-error">{{ onboarding.error() }}</p>
        <button type="button" class="btn btn-outline btn-sm mt-4" (click)="load()">Réessayer</button>
      </div>
    } @else if (ready()) {
      <div class="mt-8">
        <app-menu-design-studio
          space="restaurateur"
          [restaurantId]="restaurantId()"
          [offer]="onboarding.offer()!"
          [menu]="menu()!"
          (menuChange)="onMenuChange($event)"
        />
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
        <button type="button" class="btn btn-primary" (click)="next()">Continuer</button>
        <p class="field-hint">
          Vous pourrez changer de style à tout moment, même une fois votre carte en ligne.
        </p>
      </div>
    }
  `,
})
export class StyleComponent implements OnInit {
  readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  readonly menu = this.onboarding.menu;
  readonly restaurantId = computed(() => this.onboarding.restaurantId() ?? '');
  readonly ready = computed(() => this.onboarding.loaded() && this.onboarding.offer() !== null);

  ngOnInit(): void {
    // L'étape précédente vient d'écrire la carte : on relit l'état du serveur plutôt que
    // de se fier à ce qui était en mémoire avant la validation.
    this.load();
  }

  load(): void {
    this.onboarding.reload().subscribe();
  }

  onMenuChange(menu: Menu): void {
    this.onboarding.setMenu(menu);
  }

  next(): void {
    this.router.navigate(['/onboarding', 'publish']);
  }
}
