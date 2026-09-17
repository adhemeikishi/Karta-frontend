import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { formatPrice } from '../../menu/menu.model';
import { ItemShare, KartaPayDashboardStats, TopItem } from '../../models/restaurant.model';
import { RestaurantService } from '../../services/restaurant.service';

/**
 * Couleurs du camembert, dans l'ordre où le backend renvoie les parts : les plats du plus
 * au moins vendeur, puis "Autres" en dernier (voir `KartaPayDashboardService`, au plus 6
 * plats + "Autres" — la palette n'a donc jamais besoin de boucler sur elle-même).
 */
const BREAKDOWN_PALETTE: readonly string[] = [
  'var(--k-persimmon)',
  'var(--k-ink-900)',
  'var(--k-success)',
  'var(--k-warning)',
  'var(--k-danger)',
  'var(--k-ink-500)',
  'var(--k-ink-300)',
];

/** Rayon choisi pour que la circonférence du camembert vaille exactement 100 (unités = %). */
const DONUT_RADIUS = 100 / (2 * Math.PI);

interface DonutSegment extends ItemShare {
  color: string;
  dasharray: string;
  dashoffset: number;
}

interface HourBar {
  hour: number;
  scans: number;
  ratio: number;
  label: string;
}

/**
 * Tableau de bord Karta Pay : scans, chiffre d'affaires, plats les plus vendus, répartition
 * du CA, panier moyen et heures de pointe — sur les 30 derniers jours pour les mesures qui
 * ont besoin d'une fenêtre (voir `KartaPayDashboardService` côté backend).
 *
 * Page distincte de « Statistiques » (scans uniquement) : voir le brief Passe 3B. Tout le
 * calcul (CA, pourcentages, panier moyen) vient de
 * {@link RestaurantService.kartaPayDashboard} — cette page n'affiche que ce que le backend
 * a déjà calculé, aucun recalcul métier ici.
 */
@Component({
  selector: 'app-kartapay-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantService = inject(RestaurantService);

  readonly restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';
  readonly donutRadius = DONUT_RADIUS;

  readonly stats = signal<KartaPayDashboardStats | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly topItems = computed<TopItem[]>(() => this.stats()?.topItems ?? []);

  /** Aucune commande Karta Pay sur la fenêtre : rien à montrer dans les plats/panier/camembert. */
  readonly hasOrders = computed(() => this.topItems().length > 0);

  readonly donutSegments = computed<DonutSegment[]>(() => {
    const breakdown = this.stats()?.revenueBreakdown ?? [];
    let cumulative = 0;
    return breakdown.map((share, i) => {
      const dasharray = `${share.percentage} ${Math.max(0, 100 - share.percentage)}`;
      const dashoffset = -cumulative;
      cumulative += share.percentage;
      return { ...share, color: BREAKDOWN_PALETTE[i % BREAKDOWN_PALETTE.length], dasharray, dashoffset };
    });
  });

  readonly hourBars = computed<HourBar[]>(() => {
    const hours = this.stats()?.peakHours ?? [];
    const max = Math.max(1, ...hours.map((h) => h.scans));
    return hours.map((h) => ({
      hour: h.hour,
      scans: h.scans,
      ratio: h.scans === 0 ? 0 : h.scans / max,
      label: `${this.hourLabel(h.hour)} · ${this.plural(h.scans, 'scan', 'scans')}`,
    }));
  });

  /** L'heure la plus active de la fenêtre, ou `null` si aucun scan sur la période. */
  readonly peakHour = computed<HourBar | null>(() => {
    const peak = this.hourBars().reduce<HourBar | null>(
      (best, bar) => (best === null || bar.scans > best.scans ? bar : best),
      null,
    );
    return peak && peak.scans > 0 ? peak : null;
  });

  readonly hoveredHourIndex = signal<number | null>(null);

  readonly hoveredHourBar = computed<{ label: string; left: string } | null>(() => {
    const i = this.hoveredHourIndex();
    if (i === null) {
      return null;
    }
    const bars = this.hourBars();
    const bar = bars[i];
    if (!bar) {
      return null;
    }
    return { label: bar.label, left: `${((i + 0.5) / bars.length) * 100}%` };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.restaurantService.kartaPayDashboard(this.restaurantId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  formatCount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  /** Karta Pay est EUR uniquement en V1 (voir `OrderService` côté backend). */
  formatEuros(cents: number): string {
    return formatPrice(cents, 'EUR');
  }

  formatPercentage(value: number): string {
    return `${(Math.round(value * 10) / 10).toFixed(1).replace('.', ',')} %`;
  }

  hourLabel(hour: number): string {
    return `${hour}h`;
  }

  plural(count: number, singular: string, plural: string): string {
    return `${count} ${count > 1 ? plural : singular}`;
  }
}
