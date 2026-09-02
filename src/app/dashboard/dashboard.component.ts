import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardStats } from '../models/dashboard.model';
import { RestaurantSummary } from '../models/restaurant.model';
import { DashboardService } from '../services/dashboard.service';
import { RestaurantService } from '../services/restaurant.service';
import { ShellService } from '../layout/shell.service';
import { offerBadgeClass } from '../restaurants/offer-badge';

interface ActivityBar {
  label: string;
  value: number;
  ratio: number;
  accent: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly shell = inject(ShellService);

  readonly offerBadgeClass = offerBadgeClass;

  readonly stats = signal<DashboardStats | null>(null);
  readonly restaurants = signal<RestaurantSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly skeletons = [0, 1, 2, 3];

  /** Clients les plus actifs (par total de scans), pour lecture rapide de l'état. */
  readonly topClients = computed(() =>
    [...this.restaurants()].sort((a, b) => b.totalScans - a.totalScans).slice(0, 5),
  );

  readonly activity = computed<ActivityBar[]>(() => {
    const s = this.stats();
    if (!s) {
      return [];
    }
    const rows = [
      { label: "Aujourd'hui", value: s.scansToday },
      { label: 'Cette semaine', value: s.scansThisWeek },
      { label: 'Ce mois', value: s.scansThisMonth },
    ];
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r, i) => ({
      label: r.label,
      value: r.value,
      ratio: r.value / max,
      accent: i === 0,
    }));
  });

  ngOnInit(): void {
    this.shell.setBreadcrumbs([{ label: 'Dashboard' }]);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      stats: this.dashboardService.getStats(),
      restaurants: this.restaurantService.list(),
    }).subscribe({
      next: ({ stats, restaurants }) => {
        this.stats.set(stats);
        this.restaurants.set(restaurants);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger le tableau de bord.');
        this.loading.set(false);
      },
    });
  }
}
