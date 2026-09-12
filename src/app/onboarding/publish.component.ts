import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Menu } from '../menu/menu.model';
import { MenuService } from '../menu/menu.service';
import { can } from '../restaurateur/plan';
import { OnboardingService } from './onboarding.service';

/**
 * Étape 05 — la mise en ligne, confirmée par le restaurateur.
 *
 * Rien n'a été publié jusqu'ici : ni l'import, ni la validation de la carte, ni le choix
 * du style. C'est ce bouton, et lui seul, qui rend la carte visible derrière le QR — la
 * distinction enregistrer / publier reste vraie jusqu'au bout du parcours.
 *
 * La publication passe par `PUT .../menu/publish`, le même appel que l'Espace
 * Restaurateur et le back-office. C'est aussi elle qui clôt l'onboarding côté serveur
 * (voir `Restaurant.completeOnboarding`) : le frontend n'a rien à marquer.
 */
@Component({
  selector: 'app-onboarding-publish',
  imports: [RouterLink],
  template: `
    <div class="text-center">
      <p class="eyebrow">05</p>
      <h1 class="page-title mt-2 text-[1.6rem] sm:text-[1.75rem]">Votre menu est prêt</h1>
      <p class="lead mx-auto mt-3 max-w-md">
        En publiant, votre carte devient visible pour toute personne qui scanne votre QR code.
        Vous pourrez la modifier ou la retirer à tout moment.
      </p>
    </div>

    <section class="card card-pad mx-auto mt-8 max-w-md">
      <dl class="space-y-3">
        <div class="flex items-baseline justify-between gap-4">
          <dt class="kpi-label">Restaurant</dt>
          <dd class="truncate text-sm font-medium text-ink-900">
            {{ onboarding.restaurant()?.name }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="kpi-label">Format</dt>
          <dd class="text-sm text-ink-900">{{ isDigital() ? 'Carte numérique' : 'Carte PDF' }}</dd>
        </div>
        @if (isDigital()) {
          <div class="flex items-baseline justify-between gap-4">
            <dt class="kpi-label">Contenu</dt>
            <dd class="text-sm text-ink-900">
              <span class="mono tnum">{{ categoryCount() }}</span> catégorie(s) ·
              <span class="mono tnum">{{ itemCount() }}</span> plat(s)
            </dd>
          </div>
        }
      </dl>
    </section>

    <div class="mt-8 flex flex-col items-center gap-3">
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="publishing() || !canPublish()"
        (click)="publish()"
      >
        @if (publishing()) {
          <span class="spinner"></span>
        }
        Publier mon menu
      </button>

      @if (!canPublish()) {
        <p class="alert-warning">
          Votre carte est encore vide. Ajoutez au moins un plat avant de la publier.
        </p>
      }
      @if (errorMessage()) {
        <p class="alert-error">{{ errorMessage() }}</p>
      }

      <a [routerLink]="backLink()" class="btn btn-ghost btn-sm">Revenir en arrière</a>
    </div>
  `,
})
export class PublishComponent implements OnInit {
  readonly onboarding = inject(OnboardingService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);

  readonly publishing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isDigital = computed(() => can(this.onboarding.offer(), 'structuredMenu'));

  readonly categoryCount = computed(
    () => this.onboarding.menu()?.structure?.categories.length ?? 0,
  );

  readonly itemCount = computed(() =>
    (this.onboarding.menu()?.structure?.categories ?? []).reduce(
      (total, category) => total + category.items.length,
      0,
    ),
  );

  /**
   * Le serveur refuse de publier une carte vide (`requirePublishableContent`). L'annoncer
   * ici évite un aller-retour qui se solderait par une erreur.
   */
  readonly canPublish = computed(() =>
    this.isDigital() ? this.itemCount() > 0 : this.onboarding.menu()?.pdf != null,
  );

  /** Une carte PDF n'a traversé ni vérification ni style : on revient à l'import. */
  readonly backLink = computed(() => (this.isDigital() ? '/onboarding/style' : '/onboarding/menu'));

  ngOnInit(): void {
    if (!this.onboarding.loaded()) {
      this.onboarding.reload().subscribe();
    }
  }

  publish(): void {
    const restaurantId = this.onboarding.restaurantId();
    if (!restaurantId || this.publishing()) {
      return;
    }
    this.publishing.set(true);
    this.errorMessage.set(null);

    this.menuService.publish(restaurantId).subscribe({
      next: (menu: Menu) => {
        this.onboarding.setMenu(menu);
        this.publishing.set(false);
        // Le restaurant vient d'être marqué comme configuré côté serveur : on relit son
        // état pour que le retour vers l'espace ne repasse pas par le parcours.
        this.onboarding.reload().subscribe();
        this.router.navigate(['/onboarding', 'success']);
      },
      error: (err) => {
        this.publishing.set(false);
        this.errorMessage.set(err?.error?.message ?? "La publication n'a pas abouti. Réessayez.");
      },
    });
  }
}
