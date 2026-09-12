import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { Menu } from '../menu/menu.model';
import { MenuService } from '../menu/menu.service';
import { MenuDraftService } from '../menu/review/menu-draft.service';
import { Restaurant } from '../models/restaurant.model';
import { AuthService } from '../services/auth.service';
import { RestaurantService } from '../services/restaurant.service';
import { OnboardingStep, stepFor } from './onboarding.model';

/**
 * État du parcours de configuration, relu depuis le serveur.
 *
 * Ne stocke aucune progression : l'étape courante est <em>calculée</em> à partir du
 * restaurant, du menu et de la présence d'un brouillon KartaIA (voir {@link stepFor}).
 * C'est ce qui permet de reprendre là où l'on s'était arrêté, y compris depuis un autre
 * appareil, sans rien persister côté navigateur.
 *
 * Un seul chargement pour tout le parcours ; chaque étape appelle {@link refresh} après
 * avoir modifié quelque chose, ce qui recalcule l'étape suivante.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly draftService = inject(MenuDraftService);
  private readonly auth = inject(AuthService);

  readonly restaurant = signal<Restaurant | null>(null);
  readonly menu = signal<Menu | null>(null);
  readonly hasDraft = signal(false);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly step = computed<OnboardingStep>(() =>
    stepFor(this.restaurant(), this.menu(), this.hasDraft()),
  );

  readonly offer = computed(() => this.restaurant()?.offer ?? null);

  /**
   * Restaurant du parcours : celui déjà chargé, sinon celui du compte connecté.
   *
   * L'URL du parcours ne porte pas d'identifiant — et c'est voulu : le restaurant vient
   * de l'identité renvoyée par le serveur, pas d'un paramètre que l'on pourrait changer.
   */
  readonly restaurantId = computed(
    () => this.restaurant()?.id ?? this.auth.identity()?.restaurantId ?? null,
  );

  /** Vrai dès que le serveur a répondu : les écrans attendent cet état avant de décider. */
  readonly loaded = computed(() => this.restaurant() !== null && this.menu() !== null);

  constructor() {
    // Comme le restaurant courant, ce parcours appartient à la session.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.reset();
      }
    });
  }

  /**
   * Recharge l'état complet.
   *
   * Le brouillon renvoie 404 quand il n'y en a pas : c'est une réponse normale, pas une
   * erreur — elle est traduite en « aucun brouillon » plutôt que de faire échouer tout
   * le chargement.
   */
  refresh(restaurantId: string): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    return forkJoin({
      restaurant: this.restaurantService.getById(restaurantId),
      menu: this.menuService.getMenu(restaurantId),
      hasDraft: this.draftService.getDraft(restaurantId).pipe(
        map(() => true),
        catchError(() => of(false)),
      ),
    }).pipe(
      tap({
        next: ({ restaurant, menu, hasDraft }) => {
          this.restaurant.set(restaurant);
          this.menu.set(menu);
          this.hasDraft.set(hasDraft);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Impossible de charger votre configuration.');
        },
      }),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  /** Recharge l'état du compte connecté. Sans effet si aucun restaurant n'y est rattaché. */
  reload(): Observable<void> {
    const id = this.restaurantId();
    return id ? this.refresh(id) : of(undefined);
  }

  /** Met à jour le menu après une action d'étape, sans refaire tout le chargement. */
  setMenu(menu: Menu): void {
    this.menu.set(menu);
  }

  setHasDraft(hasDraft: boolean): void {
    this.hasDraft.set(hasDraft);
  }

  reset(): void {
    this.restaurant.set(null);
    this.menu.set(null);
    this.hasDraft.set(false);
    this.loading.set(false);
    this.error.set(null);
  }
}
