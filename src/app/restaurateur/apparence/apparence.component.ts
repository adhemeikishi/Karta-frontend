import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuDesignStudioComponent } from '../../menu/design/menu-design-studio.component';
import { Menu } from '../../menu/menu.model';
import { MenuService } from '../../menu/menu.service';
import { RestaurantContextService } from '../restaurant-context.service';

/**
 * « Apparence » — l'habillage de la carte du restaurateur.
 *
 * Cette page n'implémente aucun studio : elle monte {@link MenuDesignStudioComponent},
 * déjà utilisé par le back-office, qui porte les cinq presets, l'aperçu permanent et la
 * séparation Enregistrer / Publier. Un second studio finirait par diverger du premier.
 *
 * Le rôle de ce composant se limite donc à trois choses : poser l'en-tête et le retour
 * vers « Ma carte », fournir au studio le menu dont il a besoin, et expliquer le cas où
 * l'apparence n'est pas disponible (offre BASIC).
 *
 * Trois notions restent distinctes, et le studio les garde distinctes : l'aperçu (jamais
 * persisté), l'enregistrement (base), la publication (mise en ligne, toujours déclenchée
 * explicitement). Rien n'est publié ici en effet de bord d'un enregistrement.
 */
@Component({
  selector: 'app-apparence',
  imports: [RouterLink, MenuDesignStudioComponent],
  templateUrl: './apparence.component.html',
})
export class ApparenceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly menuService = inject(MenuService);
  private readonly context = inject(RestaurantContextService);

  readonly restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';

  /** Chargé une seule fois par le châssis — jamais rechargé ici. */
  readonly restaurant = this.context.restaurant;

  readonly menu = signal<Menu | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /**
   * L'apparence suppose une carte numérique : le backend refuse
   * `PUT .../menu/design` pour une offre BASIC (menu PDF). On l'explique au lieu de
   * laisser le restaurateur découvrir l'erreur au moment d'enregistrer.
   */
  readonly isBasic = computed(() => this.restaurant()?.offer === 'BASIC');

  /** Le studio a besoin du restaurant (pour l'offre) et du menu (compteurs, statut). */
  readonly ready = computed(() => this.restaurant() !== null && this.menu() !== null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.menuService.getMenu(this.restaurantId).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set("Impossible de charger l'apparence de votre carte.");
        this.loading.set(false);
      },
    });
  }

  /** Le studio publie et dépublie : il renvoie le menu à jour pour garder le statut juste. */
  onMenuChange(menu: Menu): void {
    this.menu.set(menu);
  }
}
