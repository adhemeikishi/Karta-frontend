import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DailyScans, RestaurantScanStats } from '../../models/restaurant.model';
import { StatsComponent } from './stats.component';

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

  it('compare les 7 derniers jours aux 7 précédents, sur la même série', () => {
    create();
    // 7 jours à 0 … puis 7 jours à 1 (semaine précédente), puis 7 jours à 2.
    const daily = series([...Array(16).fill(0), ...Array(7).fill(1), ...Array(7).fill(2)]);
    http.expectOne(URL).flush(stats({ daily }));

    // 14 → 7 : +100 %.
    expect(fixture.componentInstance.weekTrend()).toBe(100);
    expect(fixture.componentInstance.formatTrend(100)).toBe('+100,0 %');
  });

  it('n’annonce aucune évolution quand la semaine précédente est vide', () => {
    create();
    const daily = series([...Array(23).fill(0), ...Array(7).fill(5)]);
    http.expectOne(URL).flush(stats({ daily }));

    // « +100 % » à partir de zéro serait flatteur, pas informatif.
    expect(fixture.componentInstance.weekTrend()).toBeNull();
    fixture.detectChanges();
    expect(text()).toContain('face à une semaine sans scan');
  });

  it('normalise les barres sur le maximum réel, sans barre fantôme', () => {
    create();
    http.expectOne(URL).flush(stats({ daily: series([...Array(29).fill(0), 4]) }));

    const bars = fixture.componentInstance.bars();
    expect(fixture.componentInstance.chartMax()).toBe(4);
    expect(bars[29].ratio).toBe(1);
    // Un jour sans scan garde une hauteur nulle : aucune barre ne doit suggérer un scan.
    expect(bars[0].ratio).toBe(0);
  });

  it('explique l’absence de données au lieu de la constater', () => {
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
});
