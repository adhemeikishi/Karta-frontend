import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService, Identity } from './auth.service';
import { restaurantAccessGuard, restaurateurGuard } from './restaurateur.guard';

const ADMIN: Identity = { username: 'admin', role: 'ADMIN', restaurantId: null };
const RESTAURATEUR: Identity = {
  username: 'resto@karta.local',
  role: 'RESTAURATEUR',
  restaurantId: 'r-1',
};

/**
 * Les deux espaces sont étanches, et un restaurateur n'ouvre que le sien. Ces gardes
 * sont un confort d'interface — le backend refuse déjà (`RestaurateurScopeFilter`) —
 * mais c'est ce confort qui évite un écran entièrement couvert d'erreurs 403.
 */
describe('Gardes d’accès aux deux espaces', () => {
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  function route(params: Record<string, string> = {}): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
  }

  const state = {} as RouterStateSnapshot;

  function run(guard: typeof adminGuard, params: Record<string, string> = {}): true | string {
    const result = TestBed.runInInjectionContext(() => guard(route(params), state));
    if (result === true) {
      return true;
    }
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  // ------------------------------------------------------------------ back-office

  it('laisse un administrateur entrer dans le back-office', () => {
    auth.setCredentials('admin', 'x', ADMIN);
    expect(run(adminGuard)).toBe(true);
  });

  it('renvoie un restaurateur hors du back-office, vers son espace', () => {
    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    expect(run(adminGuard)).toBe('/app');
  });

  // ------------------------------------------------------------------ espace restaurateur

  it('laisse un restaurateur entrer dans son espace', () => {
    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    expect(run(restaurateurGuard)).toBe(true);
    expect(run(restaurantAccessGuard, { restaurantId: 'r-1' })).toBe(true);
  });

  it('renvoie un administrateur hors de l’Espace Restaurateur, vers le back-office', () => {
    auth.setCredentials('admin', 'x', ADMIN);
    expect(run(restaurateurGuard)).toBe('/admin/dashboard');
    expect(run(restaurantAccessGuard, { restaurantId: 'r-1' })).toBe('/admin/dashboard');
  });

  it('refuse le restaurant d’un autre et ramène le restaurateur au sien', () => {
    // Le cœur du sujet : l'identifiant de l'URL n'est jamais une autorisation.
    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    expect(run(restaurantAccessGuard, { restaurantId: 'r-2' })).toBe('/app/r-1/carte');
    expect(run(restaurantAccessGuard, { restaurantId: 'R-1' })).toBe('/app/r-1/carte');
  });

  it('envoie un restaurateur sans restaurant vers l’écran qui l’explique', () => {
    auth.setCredentials('x', 'x', { username: 'x', role: 'RESTAURATEUR', restaurantId: null });
    expect(run(restaurantAccessGuard, { restaurantId: 'r-1' })).toBe('/app');
  });

  // ------------------------------------------------------------------ identité inconnue

  it('repasse par la connexion quand l’identité est inconnue', () => {
    // Session héritée d'une version antérieure : on n'ouvre aucun espace sur un doute.
    auth.setCredentials('legacy', 'x', null);
    expect(run(adminGuard)).toBe('/login');
    expect(run(restaurateurGuard)).toBe('/login');
    expect(run(restaurantAccessGuard, { restaurantId: 'r-1' })).toBe('/login');
  });
});
