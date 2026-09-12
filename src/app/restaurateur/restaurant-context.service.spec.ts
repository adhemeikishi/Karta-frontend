import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Restaurant } from '../models/restaurant.model';
import { RestaurantContextService } from './restaurant-context.service';

const RESTAURANT: Restaurant = {
  id: 'r-1',
  name: 'Chez Karta',
  offer: 'PRO',
  onboardingCompletedAt: '2026-01-01T10:00:00Z',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-02T10:00:00Z',
};

const URL = `${environment.apiBaseUrl}/api/admin/restaurants`;

describe('RestaurantContextService', () => {
  let service: RestaurantContextService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RestaurantContextService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    service.clear();
  });

  it('charge le restaurant courant par RestaurantService.getById — aucun nouvel endpoint', () => {
    service.load('r-1');
    expect(service.loading()).toBeTrue();

    http.expectOne(`${URL}/r-1`).flush(RESTAURANT);

    expect(service.restaurant()).toEqual(RESTAURANT);
    expect(service.restaurantId()).toBe('r-1');
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('ne recharge pas le restaurant déjà en mémoire', () => {
    service.load('r-1');
    http.expectOne(`${URL}/r-1`).flush(RESTAURANT);

    // Navigation « Ma carte » → « Mon QR » : aucun aller-retour réseau supplémentaire.
    service.load('r-1');
    http.expectNone(`${URL}/r-1`);
    expect(service.restaurant()).toEqual(RESTAURANT);
  });

  it('recharge quand l’identifiant change', () => {
    service.load('r-1');
    http.expectOne(`${URL}/r-1`).flush(RESTAURANT);

    service.load('r-2');
    expect(service.restaurant()).toBeNull();
    http.expectOne(`${URL}/r-2`).flush({ ...RESTAURANT, id: 'r-2', name: 'Le Second' });
    expect(service.restaurantId()).toBe('r-2');
  });

  it('distingue restaurant introuvable et panne réseau', () => {
    service.load('r-404');
    http.expectOne(`${URL}/r-404`).flush('', { status: 404, statusText: 'Not Found' });
    expect(service.error()).toBe('Ce restaurant est introuvable.');
    expect(service.loading()).toBeFalse();

    service.clear();
    service.load('r-500');
    http.expectOne(`${URL}/r-500`).flush('', { status: 500, statusText: 'Server Error' });
    expect(service.error()).toBe('Impossible de charger votre restaurant.');
  });

  it('ignore un identifiant vide plutôt que d’appeler l’API', () => {
    service.load('');
    http.expectNone(() => true);
    expect(service.loading()).toBeFalse();
  });
});
