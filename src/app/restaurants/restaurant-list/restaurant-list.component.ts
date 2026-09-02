import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  RESTAURANT_OFFERS,
  RestaurantOffer,
  RestaurantSummary,
} from '../../models/restaurant.model';
import { RestaurantService } from '../../services/restaurant.service';
import { ShellService } from '../../layout/shell.service';
import { offerBadgeClass } from '../offer-badge';

/**
 * Page /admin/restaurants : liste enrichie (QR + scans) alimentée par
 * RestaurantService.list() (GET /api/admin/restaurants -> RestaurantSummaryResponse[]).
 * Recherche par nom côté client (l'endpoint ne prend pas de paramètre de filtre).
 * La création utilise RestaurantService.create() ; aucune donnée fictive.
 */
@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-list.component.html',
})
export class RestaurantListComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly shell = inject(ShellService);

  readonly restaurants = signal<RestaurantSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly search = signal('');
  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.restaurants();
    }
    return this.restaurants().filter((r) => r.name.toLowerCase().includes(term));
  });

  readonly offers = RESTAURANT_OFFERS;
  readonly offerBadgeClass = offerBadgeClass;

  readonly creating = signal(false);
  readonly createLoading = signal(false);
  readonly createError = signal<string | null>(null);
  newRestaurantName = '';
  newRestaurantOffer: RestaurantOffer = 'BASIC';

  ngOnInit(): void {
    this.shell.setBreadcrumbs([{ label: 'Clients' }]);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.restaurantService.list().subscribe({
      next: (list) => {
        this.restaurants.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les clients.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.newRestaurantName = '';
    this.newRestaurantOffer = 'BASIC';
    this.createError.set(null);
    this.creating.set(true);
  }

  closeCreate(): void {
    if (this.createLoading()) {
      return;
    }
    this.creating.set(false);
  }

  submitCreate(): void {
    const name = this.newRestaurantName.trim();
    if (!name) {
      this.createError.set('Le nom est requis.');
      return;
    }

    this.createLoading.set(true);
    this.createError.set(null);
    this.restaurantService.create(name, this.newRestaurantOffer).subscribe({
      next: () => {
        this.createLoading.set(false);
        this.creating.set(false);
        this.load();
      },
      error: (err) => {
        this.createLoading.set(false);
        this.createError.set(err?.status === 400 ? 'Nom invalide.' : "L'ajout du client a échoué.");
      },
    });
  }
}
