import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Restaurant } from '../models/restaurant.model';
import { Observable, of, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RestaurantService } from '../services/restaurant.service';

/**
 * Restaurant courant de l'Espace Restaurateur.
 *
 * Le backend n'expose aucune notion de session restaurateur (un seul compte, voir
 * `SecurityConfig`) : le contexte vient donc de l'URL (`/app/:restaurantId`) et rien
 * d'autre. Ce service ne fait qu'un seul appel, par {@link RestaurantService.getById},
 * et le met à disposition de toutes les pages du châssis (carte aujourd'hui ;
 * apparence, QR, statistiques ensuite) — aucun nouvel endpoint, aucun service HTTP
 * supplémentaire.
 *
 * Le chargement est ignoré si le restaurant demandé est déjà celui en mémoire : passer
 * de « Ma carte » à « Mon QR » ne doit pas refaire l'aller-retour réseau.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantContextService {
  private readonly restaurantService = inject(RestaurantService);
  private readonly auth = inject(AuthService);

  constructor() {
    // Le restaurant courant appartient à la session : il disparaît avec elle, quel que
    // soit le chemin de sortie (bouton, 401, changement de compte). Réagir au signal
    // plutôt que d'appeler `clear()` depuis chaque bouton de déconnexion — un nouveau
    // chemin de logout ne peut pas oublier cet état.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.clear();
      }
    });
  }

  readonly restaurant = signal<Restaurant | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly restaurantId = computed(() => this.restaurant()?.id ?? null);

  load(id: string): void {
    if (!id) {
      return;
    }
    this.ensure(id).subscribe({ error: () => undefined });
  }

  /**
   * Le restaurant demandé, chargé si besoin.
   *
   * Renvoie immédiatement celui déjà en mémoire : une garde de route et le châssis
   * qu'elle laisse passer demandent le même restaurant à quelques millisecondes
   * d'intervalle — un seul aller-retour réseau doit suffire.
   *
   * Attend un identifiant réel : ses appelants le tiennent d'un paramètre de route déjà
   * vérifié. {@link load} filtre le cas vide pour les appels d'interface.
   */
  ensure(id: string): Observable<Restaurant> {
    const cached = this.restaurant();
    if (cached && cached.id === id) {
      return of(cached);
    }
    this.restaurant.set(null);
    this.loading.set(true);
    this.error.set(null);
    return this.restaurantService.getById(id).pipe(
      tap({
        next: (restaurant) => {
          this.restaurant.set(restaurant);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.status === 404
              ? 'Ce restaurant est introuvable.'
              : 'Impossible de charger votre restaurant.',
          );
        },
      }),
    );
  }

  clear(): void {
    this.restaurant.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
}
