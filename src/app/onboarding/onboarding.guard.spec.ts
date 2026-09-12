import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Observable, isObservable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { RestaurantContextService } from '../restaurateur/restaurant-context.service';
import { AuthService } from '../services/auth.service';
import { onboardingEntryGuard, onboardingGuard } from './onboarding.guard';
import { OnboardingService } from './onboarding.service';

const BASE = `${environment.apiBaseUrl}/api/admin/restaurants/r-1`;

function restaurant(completed: boolean, offer = 'PRO') {
  return {
    id: 'r-1',
    name: 'Chez Karta',
    offer,
    onboardingCompletedAt: completed ? '2026-02-01T10:00:00Z' : null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };
}

function menu(overrides: Record<string, unknown> = {}) {
  return {
    offer: 'PRO',
    type: 'STRUCTURED',
    status: 'DRAFT',
    version: 1,
    published: false,
    publishedAt: null,
    pdf: null,
    structure: null,
    ...overrides,
  };
}

/**
 * Deux verrous, une seule règle : c'est le serveur qui dit si un restaurant est
 * configuré. Personne ne saute le parcours en écrivant dans son navigateur, et personne
 * ne se retrouve renvoyé au début parce qu'il a changé d'appareil.
 */
describe('Gardes du parcours de configuration', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth.setCredentials('resto@karta.local', 'x', {
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(RestaurantContextService).clear();
    TestBed.inject(OnboardingService).reset();
    sessionStorage.clear();
  });

  const state = {} as RouterStateSnapshot;

  function route(params: Record<string, string> = {}): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
  }

  /** Exécute une garde et normalise son verdict en `true` ou en URL de redirection. */
  function verdict(result: unknown): Observable<true | string> {
    const source = isObservable(result) ? (result as Observable<unknown>) : of(result);
    return new Observable((subscriber) => {
      source.subscribe((value) => {
        subscriber.next(value === true ? true : router.serializeUrl(value as UrlTree));
        subscriber.complete();
      });
    });
  }

  // ------------------------------------------------------------------ verrou sur /app

  it('conduit au parcours tant que le restaurant n’a jamais été publié', (done) => {
    verdict(
      TestBed.runInInjectionContext(() => onboardingGuard(route({ restaurantId: 'r-1' }), state)),
    ).subscribe((result) => {
      expect(result).toBe('/onboarding');
      done();
    });
    http.expectOne(`${BASE}`).flush(restaurant(false));
  });

  it('laisse entrer dans l’espace dès que le restaurant est configuré', (done) => {
    verdict(
      TestBed.runInInjectionContext(() => onboardingGuard(route({ restaurantId: 'r-1' }), state)),
    ).subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
    http.expectOne(`${BASE}`).flush(restaurant(true));
  });

  it('laisse passer si le restaurant ne charge pas — le châssis affichera l’erreur', (done) => {
    verdict(
      TestBed.runInInjectionContext(() => onboardingGuard(route({ restaurantId: 'r-1' }), state)),
    ).subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
    http.expectOne(`${BASE}`).flush('', { status: 500, statusText: 'Server Error' });
  });

  // ------------------------------------------------------------------ entrée du parcours

  /** Sert les trois requêtes du chargement initial du parcours. */
  function flushOnboardingState(options: {
    completed: boolean;
    menu?: Record<string, unknown>;
    draft?: boolean;
  }): void {
    http.expectOne(`${BASE}`).flush(restaurant(options.completed));
    http.expectOne(`${BASE}/menu`).flush(menu(options.menu));
    const draft = http.expectOne(`${BASE}/menu/ai/draft`);
    if (options.draft) {
      draft.flush({ categories: [], categoryCount: 0, itemCount: 0 });
    } else {
      draft.flush('', { status: 404, statusText: 'Not Found' });
    }
  }

  it('ouvre l’accueil pour un restaurant tout neuf', (done) => {
    verdict(TestBed.runInInjectionContext(() => onboardingEntryGuard(route(), state))).subscribe(
      (result) => {
        expect(result).toBe('/onboarding/welcome');
        done();
      },
    );
    flushOnboardingState({ completed: false });
  });

  it('reprend à la vérification quand une analyse attend', (done) => {
    verdict(TestBed.runInInjectionContext(() => onboardingEntryGuard(route(), state))).subscribe(
      (result) => {
        expect(result).toBe('/onboarding/review');
        done();
      },
    );
    flushOnboardingState({
      completed: false,
      menu: { pdf: { assetId: 'a', url: 'u', originalFilename: 'c.pdf', sizeBytes: 1, uploadedAt: 'x' } },
      draft: true,
    });
  });

  it('reprend au style quand la carte est enregistrée', (done) => {
    verdict(TestBed.runInInjectionContext(() => onboardingEntryGuard(route(), state))).subscribe(
      (result) => {
        expect(result).toBe('/onboarding/style');
        done();
      },
    );
    flushOnboardingState({ completed: false, menu: { version: 2, status: 'READY' } });
  });

  it('renvoie un restaurant déjà configuré vers son espace', (done) => {
    verdict(TestBed.runInInjectionContext(() => onboardingEntryGuard(route(), state))).subscribe(
      (result) => {
        expect(result).toBe('/app/r-1/carte');
        done();
      },
    );
    flushOnboardingState({ completed: true, menu: { version: 2, published: true } });
  });

  it('renvoie vers /app un compte sans restaurant rattaché', () => {
    auth.setCredentials('x', 'x', { username: 'x', role: 'RESTAURATEUR', restaurantId: null });
    const result = TestBed.runInInjectionContext(() => onboardingEntryGuard(route(), state));
    expect(router.serializeUrl(result as UrlTree)).toBe('/app');
  });
});
