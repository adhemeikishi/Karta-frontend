import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DailyScans, Restaurant, RestaurantScanStats } from '../../models/restaurant.model';
import { AuthService } from '../../services/auth.service';
import { RestaurantContextService } from '../restaurant-context.service';
import { StatsComponent } from './stats.component';

const RESTAURANT: Restaurant = {
  id: 'r-1',
  name: 'Chez Karta',
  offer: 'PRO',
  onboardingCompletedAt: '2026-01-01T10:00:00Z',
  kartaPayEnabled: false,
  subscriptionActive: true,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const URL = `${environment.apiBaseUrl}/api/admin/restaurants/r-1/stats`;

/** 30 jours consécutifs, dont les valeurs sont fournies par `scans`. */
function series(scans: number[]): DailyScans[] {
  return scans.map((s, i) => ({
    date: new Date(Date.UTC(2026, 7, 11 + i)).toISOString().slice(0, 10),
    scans: s,
  }));
}

function stats(overrides: Partial<RestaurantScanStats> = {}): RestaurantScanStats {
  return {
    today: 3,
    last7Days: 21,
    last30Days: 60,
    total: 142,
    daily: series(Array(30).fill(2)),
    ...overrides,
  };
}

describe('StatsComponent', () => {
  let fixture: ComponentFixture<StatsComponent>;
  let http: HttpTestingController;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function create(): void {
    fixture = TestBed.createComponent(StatsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ restaurantId: 'r-1' }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    TestBed.inject(RestaurantContextService).clear();
  });

  it('lit les scans du restaurant courant par le service existant', () => {
    create();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush(stats());
    fixture.detectChanges();

    expect(text()).toContain('142');
    expect(text()).toContain('Aujourd’hui'.replace('’', "'"));
  });

  it('formate les grands nombres à la française', () => {
    create();
    http.expectOne(URL).flush(stats({ total: 1248 }));
    // Espace insécable étroit inséré par Intl : on compare sur les chiffres.
    expect(fixture.componentInstance.formatCount(1248).replace(/\s/g, '')).toBe('1248');
  });

  it('choisit la semaine par défaut quand elle a du scan', () => {
    create();
    http.expectOne(URL).flush(stats({ last7Days: 21 }));
    expect(fixture.componentInstance.period()).toBe('week');
  });

  it('bascule sur le mois par défaut quand la semaine est retombée à zéro mais pas le mois', () => {
    create();
    const daily = series([...Array(10).fill(0), 4, ...Array(19).fill(0)]);
    http.expectOne(URL).flush(stats({ last7Days: 0, last30Days: 4, daily }));
    expect(fixture.componentInstance.period()).toBe('month');
  });

  it('compare les 7 derniers jours aux 7 précédents, sur la même série, seulement en vue 7 jours', () => {
    create();
    // 7 jours à 0 … puis 7 jours à 1 (semaine précédente), puis 7 jours à 2.
    const daily = series([...Array(16).fill(0), ...Array(7).fill(1), ...Array(7).fill(2)]);
    http.expectOne(URL).flush(stats({ daily }));

    // 14 → 7 : +100 %.
    expect(fixture.componentInstance.weekTrend()).toBe(100);
    expect(fixture.componentInstance.formatTrend(100)).toBe('+100,0 %');
    fixture.detectChanges();
    expect(text()).toContain('+100,0 %');

    fixture.componentInstance.setPeriod('month');
    fixture.detectChanges();
    // En vue 30 jours, il n'y a pas de « 30 jours précédents » pour comparer.
    expect(text()).not.toContain('+100,0 %');
  });

  it('n’affiche aucune évolution quand la semaine précédente est vide, plutôt que d’en inventer une', () => {
    create();
    const daily = series([...Array(23).fill(0), ...Array(7).fill(5)]);
    http.expectOne(URL).flush(stats({ daily }));

    // « +100 % » à partir de zéro serait flatteur, pas informatif.
    expect(fixture.componentInstance.weekTrend()).toBeNull();
    fixture.detectChanges();
    expect(text()).not.toContain('%');
  });

  it('normalise les barres sur le maximum de la fenêtre affichée, sans barre fantôme', () => {
    create();
    http.expectOne(URL).flush(stats({ daily: series([...Array(29).fill(0), 4]) }));
    fixture.componentInstance.setPeriod('month');

    const bars = fixture.componentInstance.bars();
    expect(bars.length).toBe(30);
    expect(bars[29].ratio).toBe(1);
    // Un jour sans scan garde une hauteur nulle : aucune barre ne doit suggérer un scan.
    expect(bars[0].ratio).toBe(0);
  });

  it('désigne le jour le plus actif de la fenêtre affichée, pas de tout l’historique', () => {
    create();
    // Le pic (9) tombe hors des 7 derniers jours ; dans cette fenêtre, le maximum est 3.
    const daily = series([...Array(22).fill(0), 9, 0, 0, 1, 2, 3, 1, 1]);
    http.expectOne(URL).flush(stats({ last7Days: 8, daily }));

    expect(fixture.componentInstance.period()).toBe('week');
    expect(fixture.componentInstance.peakDay()?.scans).toBe(3);

    fixture.componentInstance.setPeriod('month');
    expect(fixture.componentInstance.peakDay()?.scans).toBe(9);
  });

  it('signale une activité ancienne plutôt qu’un graphique à plat quand rien n’est arrivé en 30 jours', () => {
    create();
    http.expectOne(URL).flush(
      stats({ today: 0, last7Days: 0, last30Days: 0, total: 12, daily: series(Array(30).fill(0)) }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.isDormant()).toBeTrue();
    expect(text()).toContain('Aucun scan sur les 30 derniers jours');
    expect(text()).toContain('12 fois');
  });

  it('explique l’absence totale de scan au lieu de la constater', () => {
    create();
    http.expectOne(URL).flush(stats({ today: 0, last7Days: 0, last30Days: 0, total: 0 }));
    fixture.detectChanges();

    expect(text()).toContain('Aucun scan pour l’instant'.replace('’', "'"));
    expect(text()).toContain('Voir mon QR code');
  });

  it('reste récupérable en cas d’erreur', () => {
    create();
    http.expectOne(URL).flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain('Impossible de charger vos statistiques.');
    expect(text()).toContain('Réessayer');
  });

  it('verrouille les statistiques sans abonnement actif, sans appeler le backend', () => {
    // `RestaurantContextService` efface le restaurant tant que `AuthService` ne se
    // déclare pas connecté (voir son effet de nettoyage sur logout) : sans ceci, le
    // restaurant qu'on vient de poser serait effacé avant que le composant le lise.
    TestBed.inject(AuthService).setCredentials('resto@karta.local', 'x', {
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });
    TestBed.inject(RestaurantContextService).restaurant.set({ ...RESTAURANT, subscriptionActive: false });
    create();
    fixture.detectChanges();

    http.expectNone(URL);
    expect(text()).toContain('Statistiques de fréquentation');
    expect(text()).toContain('Abonnement');
  });
});
