import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { KartaLogoComponent } from '../shared/karta-logo.component';
import { RestaurantContextService } from './restaurant-context.service';

/** Une destination de l'espace. Toujours atteignable : voir `navigation`. */
interface NavItem {
  label: string;
  path: string;
  /** Tracé du chemin SVG (24×24, stroke 1.6) — jamais un glyphe ni un emoji. */
  icon: string;
}

interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

/**
 * Châssis de l'Espace Restaurateur.
 *
 * Volontairement PAS `LayoutComponent` : le back-office est le poste de pilotage de
 * Karta (clients, offres, dashboard global), celui-ci est l'atelier d'UN restaurateur
 * sur SA carte. Même système de design, même vocabulaire produit, aucune notion
 * d'administration.
 *
 * <strong>Colonne de navigation plutôt qu'une barre d'onglets.</strong> L'espace compte
 * quatre destinations et en accueillera d'autres ; une barre horizontale les aurait
 * fait défiler sur téléphone et n'aurait pas pu les regrouper. La colonne pose aussi la
 * seconde surface dont une interface de travail a besoin : la navigation vit sur le
 * charcoal Karta, le contenu sur le canvas, et la frontière entre les deux ne repose
 * plus sur une simple bordure. Sous `lg`, elle devient un tiroir.
 */
@Component({
  selector: 'app-restaurateur-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KartaLogoComponent],
  templateUrl: './restaurateur-shell.component.html',
})
export class RestaurateurShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly context = inject(RestaurantContextService);

  readonly restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';

  readonly restaurant = this.context.restaurant;
  readonly loading = this.context.loading;
  readonly error = this.context.error;

  /**
   * Destinations réelles uniquement. « Statistiques » n'apparaît pas tant que la page
   * n'existe pas ; une entrée qui ne mène nulle part est une promesse, pas une
   * navigation.
   */
  readonly navigation: readonly NavGroup[] = [
    {
      label: 'Ma carte',
      items: [
        {
          label: 'Contenu',
          path: 'carte',
          icon: 'M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5',
        },
        {
          label: 'Apparence',
          path: 'apparence',
          icon: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 18h.008v.008H6.75V18zm13.02-.5a3.75 3.75 0 01-5.304 0',
        },
      ],
    },
    {
      label: 'Diffusion',
      items: [
        {
          label: 'Mon QR code',
          path: 'qr',
          icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zm0 9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zm9.75-9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 13.5h3m-3 3h6m-6 3h3',
        },
        {
          label: 'Statistiques',
          path: 'statistiques',
          icon: 'M3 13.125L7.5 9l3.75 3.375L20.25 4.5M20.25 4.5h-4.5m4.5 0v4.5M3.75 19.5h16.5',
        },
      ],
    },
  ];

  readonly navOpen = signal(false);

  /**
   * Les pages à aperçu latéral (contenu de la carte, apparence) ont besoin de plus de
   * largeur que les pages à colonne unique. Lu depuis la route plutôt que deviné.
   */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly wideLayout = computed(() => /\/(carte|apparence)(\/|$|\?)/.test(this.url()));

  ngOnInit(): void {
    this.context.load(this.restaurantId);
  }

  toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeNav();
  }

  retry(): void {
    this.context.clear();
    this.context.load(this.restaurantId);
  }

  logout(): void {
    // Purge complète + retour à /login : voir AuthService.logout(). Le contexte
    // restaurant s'efface par effet, aucun bouton n'a à s'en souvenir.
    this.auth.logout();
  }
}
