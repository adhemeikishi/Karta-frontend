import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RestaurantSummary } from '../models/restaurant.model';
import { AuthService } from '../services/auth.service';
import { RestaurantService } from '../services/restaurant.service';
import { KartaLogoComponent } from '../shared/karta-logo.component';

/**
 * Point d'entrée `/app` : résout le restaurant à ouvrir.
 *
 * Pour un <strong>restaurateur</strong>, la réponse vient du backend : `/api/admin/me`
 * renvoie SON restaurant, et c'est le seul auquel il ait accès. On ouvre donc sa carte
 * directement — sans écran intermédiaire, et sans appeler la liste des restaurants, que
 * le backend lui refuse à raison (elle exposerait les autres clients).
 *
 * Pour un <strong>administrateur</strong>, qui les gère tous, on retombe sur la liste :
 * un seul restaurant ouvre directement, plusieurs affichent un choix minimal. Ce n'est
 * pas un tableau de bord — aucun compteur, aucune gestion, juste « lequel j'ouvre ».
 */
@Component({
  selector: 'app-restaurant-picker',
  imports: [RouterLink, KartaLogoComponent],
  template: `
    <div class="flex min-h-[100dvh] flex-col items-center bg-canvas px-4 py-10 sm:px-6">
      <karta-logo variant="dark" [size]="32" />

      <div class="mt-8 w-full max-w-md">
        @if (loading()) {
          <div class="card card-pad space-y-3">
            <div class="skeleton h-5 w-40"></div>
            <div class="skeleton h-11 w-full"></div>
            <div class="skeleton h-11 w-full"></div>
          </div>
        } @else if (errorMessage()) {
          <div class="card card-pad">
            <p class="alert-error">{{ errorMessage() }}</p>
            <button type="button" class="btn btn-outline btn-sm mt-4" (click)="load()">Réessayer</button>
          </div>
        } @else if (restaurants().length === 0) {
          <div class="card">
            <div class="empty-state">
              <p class="section-title">Aucun restaurant n'est encore rattaché à ce compte.</p>
              <p class="page-subtitle">
                Karta crée votre restaurant à l'ouverture de votre accès. Contactez-nous si cet
                écran persiste.
              </p>
              <a routerLink="/contact" class="btn btn-outline btn-sm mt-4">Nous contacter</a>
            </div>
          </div>
        } @else {
          <div class="card">
            <div class="card-head">
              <h1 class="section-title">Quel restaurant souhaitez-vous ouvrir ?</h1>
            </div>
            <div class="card-pad space-y-2">
              @for (restaurant of restaurants(); track restaurant.id) {
                <a
                  [routerLink]="['/app', restaurant.id, 'carte']"
                  class="btn btn-outline w-full justify-between"
                >
                  <span class="truncate">{{ restaurant.name }}</span>
                  <span aria-hidden="true">→</span>
                </a>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class RestaurantPickerComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly restaurants = signal<RestaurantSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const identity = this.auth.identity();
    if (identity?.role === 'RESTAURATEUR') {
      if (identity.restaurantId) {
        this.openCarte(identity.restaurantId);
      } else {
        // Compte restaurateur sans restaurant : configuration incomplète côté serveur.
        // Le dire, plutôt que d'appeler une liste qui sera refusée.
        this.errorMessage.set("Aucun restaurant n'est rattaché à votre compte.");
        this.loading.set(false);
      }
      return;
    }
    this.load();
  }

  /** `replaceUrl` : le bouton « précédent » ne doit pas ramener sur cet écran de transit. */
  private openCarte(restaurantId: string): void {
    this.router.navigate(['/app', restaurantId, 'carte'], { replaceUrl: true });
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.restaurantService.list().subscribe({
      next: (list) => {
        // Un seul restaurant : pas de choix à faire, on ouvre sa carte.
        if (list.length === 1) {
          this.openCarte(list[0].id);
          return;
        }
        this.restaurants.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger votre restaurant.');
        this.loading.set(false);
      },
    });
  }
}
