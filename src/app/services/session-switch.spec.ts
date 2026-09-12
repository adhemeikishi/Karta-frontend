import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { Breadcrumb, ShellService } from '../layout/shell.service';
import { RestaurantContextService } from '../restaurateur/restaurant-context.service';
import { AuthService, Identity } from './auth.service';

const ME = `${environment.apiBaseUrl}/api/admin/me`;

const ADMIN: Identity = { username: 'admin', role: 'ADMIN', restaurantId: null };
const RESTAURATEUR: Identity = {
  username: 'resto@karta.local',
  role: 'RESTAURATEUR',
  restaurantId: 'r-1',
};

/**
 * Changer de compte doit être total : c'est le bug que cette suite verrouille. Rien de
 * ce que le compte précédent a chargé — identité, restaurant courant, fil d'Ariane,
 * session de développement — ne doit survivre à sa déconnexion.
 */
describe('Bascule Admin ↔ Restaurateur', () => {
  let auth: AuthService;
  let context: RestaurantContextService;
  let shell: ShellService;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    context = TestBed.inject(RestaurantContextService);
    shell = TestBed.inject(ShellService);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  /** Charge le restaurant courant comme le ferait le châssis restaurateur. */
  function loadRestaurant(id: string, name: string): void {
    context.load(id);
    http.expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/${id}`).flush({
      id,
      name,
      offer: 'PRO',
      onboardingCompletedAt: '2026-01-01T10:00:00Z',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    });
    TestBed.flushEffects();
  }

  it('la déconnexion efface identité, identifiants et restaurant courant', () => {
    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    loadRestaurant('r-1', 'Chez Karta');
    shell.setBreadcrumbs([{ label: 'Clients', link: '/admin/restaurants' }] as Breadcrumb[]);

    auth.logout();
    TestBed.flushEffects();

    expect(auth.isAuthenticated()).toBeFalse();
    expect(auth.identity()).toBeNull();
    expect(auth.getAuthorizationHeader()).toBeNull();
    expect(context.restaurant()).toBeNull();
    expect(context.restaurantId()).toBeNull();
    expect(shell.breadcrumbs()).toEqual([]);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('un restaurateur qui succède à un admin ne récupère rien de sa session', () => {
    auth.setCredentials('admin', 'x', ADMIN);
    shell.setBreadcrumbs([{ label: 'Clients' }] as Breadcrumb[]);
    auth.logout();
    TestBed.flushEffects();

    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    expect(auth.identity()).toEqual(RESTAURATEUR);
    expect(auth.isAdmin()).toBeFalse();
    expect(shell.breadcrumbs()).toEqual([]);
    expect(context.restaurant()).toBeNull();
  });

  it('un admin qui succède à un restaurateur ne récupère pas son restaurant', () => {
    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    loadRestaurant('r-1', 'Chez Karta');
    expect(context.restaurant()?.name).toBe('Chez Karta');

    auth.logout();
    TestBed.flushEffects();
    auth.setCredentials('admin', 'x', ADMIN);
    TestBed.flushEffects();

    expect(auth.isAdmin()).toBeTrue();
    expect(context.restaurant()).toBeNull();
  });

  it('l’en-tête d’authentification suit le compte courant, jamais le précédent', () => {
    auth.setCredentials('admin', 'secret-admin', ADMIN);
    const asAdmin = auth.getAuthorizationHeader();

    auth.logout();
    auth.setCredentials('resto@karta.local', 'secret-resto', RESTAURATEUR);

    expect(auth.getAuthorizationHeader()).not.toBe(asAdmin);
    expect(auth.getAuthorizationHeader()).toBe(`Basic ${btoa('resto@karta.local:secret-resto')}`);
  });

  it('une déconnexion explicite désarme l’auto-connexion de développement', (done) => {
    // Sans ce verrou, la première route protégée visitée après un logout rouvrait une
    // session ADMIN : c'était l'origine du mélange des deux espaces en local.
    auth.setCredentials('resto@karta.local', 'x', RESTAURATEUR);
    auth.logout();

    auth.tryDevAutoLogin().subscribe((success) => {
      expect(success).toBeFalse();
      expect(auth.identity()).toBeNull();
      done();
    });
    http.expectNone(ME);
  });

  it('une session neuve autorise l’auto-connexion de développement', (done) => {
    auth.tryDevAutoLogin().subscribe((success) => {
      // `devAutoLogin` n'existe qu'en développement ; en production le test vérifie
      // simplement qu'aucun appel n'est tenté.
      expect(success).toBe(!!environment.devAutoLogin);
      done();
    });
    if (environment.devAutoLogin) {
      http.expectOne(ME).flush(ADMIN);
    } else {
      http.expectNone(ME);
    }
  });
});
