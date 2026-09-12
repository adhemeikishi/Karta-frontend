import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RestaurantScanStats } from '../../models/restaurant.model';
import { RestaurantService } from '../../services/restaurant.service';

/**
 * « Statistiques » — combien de fois la carte a été ouverte.
 *
 * Une seule mesure existe réellement côté produit : le scan du QR. La page ne présente
 * donc qu'elle, sous trois périodes et une série de trente jours — pas un tableau de bord
 * analytique dont les chiffres seraient inventés pour remplir la grille.
 *
 * Tout vient de {@link RestaurantService.stats} (`GET .../restaurants/{id}/stats`), déjà
 * utilisé par le back-office et autorisé au compte restaurateur sur son propre
 * restaurant. Aucun nouvel endpoint.
 */
@Component({
  selector: 'app-stats',
  imports: [RouterLink],
  templateUrl: './stats.component.html',
})
export class StatsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantService = inject(RestaurantService);

  readonly restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';

  readonly stats = signal<RestaurantScanStats | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly hasScans = computed(() => (this.stats()?.total ?? 0) > 0);

  /**
   * Évolution des sept derniers jours face aux sept précédents.
   *
   * Calculée sur la série renvoyée par le backend — jamais sur une autre source, sinon
   * le pourcentage pourrait contredire les compteurs affichés juste à côté. `null`
   * lorsque la semaine précédente est vide : « +100 % » à partir de zéro ne veut rien
   * dire, et l'annoncer serait flatteur plutôt qu'informatif.
   */
  readonly weekTrend = computed<number | null>(() => {
    const daily = this.stats()?.daily ?? [];
    if (daily.length < 14) {
      return null;
    }
    const sum = (from: number, to: number) =>
      daily.slice(from, to).reduce((total, d) => total + d.scans, 0);
    const previous = sum(daily.length - 14, daily.length - 7);
    if (previous === 0) {
      return null;
    }
    const current = sum(daily.length - 7, daily.length);
    return ((current - previous) / previous) * 100;
  });

  /** Barres prêtes à dessiner : une par jour, normalisées sur le maximum de la période. */
  readonly bars = computed(() => {
    const daily = this.stats()?.daily ?? [];
    const max = Math.max(1, ...daily.map((d) => d.scans));
    return daily.map((d) => ({
      date: d.date,
      scans: d.scans,
      ratio: d.scans === 0 ? 0 : d.scans / max,
      label: `${this.dayLabel(d.date)} · ${this.plural(d.scans, 'scan', 'scans')}`,
    }));
  });

  /** Valeur haute de l'axe, affichée telle quelle — jamais un arrondi trompeur. */
  readonly chartMax = computed(() =>
    Math.max(...(this.stats()?.daily ?? []).map((d) => d.scans), 0),
  );

  readonly firstDay = computed(() => {
    const daily = this.stats()?.daily ?? [];
    return daily.length > 0 ? this.dayLabel(daily[0].date) : '';
  });

  readonly lastDay = computed(() => {
    const daily = this.stats()?.daily ?? [];
    return daily.length > 0 ? this.dayLabel(daily[daily.length - 1].date) : '';
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.restaurantService.stats(this.restaurantId).subscribe({
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

  /** `2026-09-02` → `2 sept.` — lisible à 390 px sous une barre de 4 px. */
  dayLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  formatCount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatTrend(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1).replace('.', ',')} %`;
  }

  plural(count: number, singular: string, plural: string): string {
    return `${count} ${count > 1 ? plural : singular}`;
  }
}
