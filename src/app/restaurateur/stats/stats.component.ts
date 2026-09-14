import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DailyScans, RestaurantScanStats } from '../../models/restaurant.model';
import { RestaurantService } from '../../services/restaurant.service';

/** Fenêtre affichée dans le graphique — un simple découpage de `daily`, jamais un appel réseau. */
type Period = 'week' | 'month';

/** Le jour le plus actif de la fenêtre affichée, prêt à annoter le graphique. */
interface PeakDay {
  date: string;
  scans: number;
  label: string;
}

/**
 * « Statistiques » — combien de fois la carte a été ouverte.
 *
 * Une seule mesure existe réellement côté produit : le scan du QR. La page ne présente
 * donc qu'elle, sous deux fenêtres (7 / 30 jours, un découpage de la même série) — pas un
 * tableau de bord analytique dont les chiffres seraient inventés pour remplir la grille.
 *
 * Tout vient de {@link RestaurantService.stats} (`GET .../restaurants/{id}/stats`), déjà
 * utilisé par le back-office et autorisé au compte restaurateur sur son propre
 * restaurant. Aucun nouvel endpoint : le sélecteur de période ne fait que trancher la
 * série de 30 jours déjà reçue, jamais une nouvelle requête.
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

  readonly period = signal<Period>('week');

  /** Jamais scanné : l'état vide historique, rien à mesurer. */
  readonly hasScans = computed(() => (this.stats()?.total ?? 0) > 0);
  /**
   * Un total existe mais rien dans la fenêtre de 30 jours que couvre `daily` : un QR
   * scanné il y a longtemps, silencieux depuis. Le graphique n'a alors rien à montrer —
   * un rectangle plat mentirait sur l'activité récente, mieux vaut le dire.
   */
  readonly isDormant = computed(() => this.hasScans() && (this.stats()?.last30Days ?? 0) === 0);

  /** La tranche de `daily` que la période choisie donne à voir. */
  private readonly visibleDaily = computed<DailyScans[]>(() => {
    const daily = this.stats()?.daily ?? [];
    return this.period() === 'week' ? daily.slice(-7) : daily;
  });

  /** Barres prêtes à dessiner : une par jour visible, normalisées sur le maximum de la fenêtre. */
  readonly bars = computed(() => {
    const daily = this.visibleDaily();
    const max = Math.max(1, ...daily.map((d) => d.scans));
    return daily.map((d) => ({
      date: d.date,
      scans: d.scans,
      ratio: d.scans === 0 ? 0 : d.scans / max,
      label: `${this.dayLabel(d.date)} · ${this.plural(d.scans, 'scan', 'scans')}`,
    }));
  });

  /** Index survolé dans `bars()`. `null` : aucune barre survolée. */
  readonly hoveredIndex = signal<number | null>(null);

  /**
   * L'infobulle du jour survolé — valeur exacte, lisible sans attendre l'infobulle
   * native du navigateur (gardée par ailleurs comme repli). `left` en pourcentage de la
   * largeur du graphique : autant de colonnes en vue 7 jours qu'en vue 30 jours, donc
   * jamais un décalage fixe en pixels.
   */
  readonly hoveredBar = computed<{ label: string; left: string } | null>(() => {
    const i = this.hoveredIndex();
    if (i === null) {
      return null;
    }
    const bars = this.bars();
    const bar = bars[i];
    if (!bar) {
      return null;
    }
    const left = bars.length > 1 ? ((i + 0.5) / bars.length) * 100 : 50;
    return { label: bar.label, left: `${left}%` };
  });

  readonly firstDay = computed(() => {
    const daily = this.visibleDaily();
    return daily.length > 0 ? this.dayLabel(daily[0].date) : '';
  });

  readonly lastDay = computed(() => {
    const daily = this.visibleDaily();
    return daily.length > 0 ? this.dayLabel(daily[daily.length - 1].date) : '';
  });

  /** Le chiffre de tête du graphique : le total de la fenêtre affichée, pas une autre source. */
  readonly periodTotal = computed(() =>
    this.period() === 'week' ? this.stats()?.last7Days ?? 0 : this.stats()?.last30Days ?? 0,
  );

  /**
   * Évolution des sept derniers jours face aux sept précédents.
   *
   * Calculée sur la série de 30 jours renvoyée par le backend — jamais sur une autre
   * source, sinon le pourcentage pourrait contredire les compteurs affichés juste à
   * côté. `null` lorsque la semaine précédente est vide : « +100 % » à partir de zéro ne
   * veut rien dire, et l'annoncer serait flatteur plutôt qu'informatif.
   *
   * N'a de sens qu'en vue 7 jours : en vue 30 jours, on n'a pas les 30 jours précédents
   * pour comparer (le backend ne renvoie que la fenêtre courante).
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

  /**
   * Le jour le plus actif de la fenêtre affichée — dérivé de la même série que les
   * barres, jamais recalculé sur une autre source. `null` si la fenêtre est silencieuse :
   * il n'y a alors rien à distinguer.
   */
  readonly peakDay = computed<PeakDay | null>(() => {
    const daily = this.visibleDaily();
    const peak = daily.reduce<DailyScans | null>(
      (best, d) => (best === null || d.scans > best.scans ? d : best),
      null,
    );
    if (!peak || peak.scans === 0) {
      return null;
    }
    return { date: peak.date, scans: peak.scans, label: this.dayLabel(peak.date) };
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
        // Fenêtre par défaut : la plus récente qui a quelque chose à montrer. Un
        // restaurant actif regarde sa semaine ; un restaurant dont les scans de la
        // semaine sont retombés à zéro mérite de voir son mois plutôt qu'un graphique
        // vide par défaut.
        this.period.set(stats.last7Days > 0 || stats.last30Days === 0 ? 'week' : 'month');
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  setPeriod(period: Period): void {
    this.period.set(period);
    // Le nombre de colonnes change : un index survolé resté de l'autre vue pointerait
    // sur une barre différente, ou plus aucune.
    this.hoveredIndex.set(null);
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
