import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { RestaurantSummary } from '../models/restaurant.model';
import { AuthService } from '../services/auth.service';
import { RestaurantPickerComponent } from './restaurant-picker.component';

const LIST_URL = `${environment.apiBaseUrl}/api/admin/restaurants`;

function summary(id: string, name: string): RestaurantSummary {
  return {
    id,
    name,
    offer: 'PRO',
    onboardingCompletedAt: '2026-01-01T10:00:00Z',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    qrCodeCount: 1,
    activeQrCodeCount: 1,
    totalScans: 0,
  };
}

describe('RestaurantPickerComponent — résolution de /app', () => {
  let fixture: ComponentFixture<RestaurantPickerComponent>;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RestaurantPickerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(RestaurantPickerComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(AuthService).clearCredentials();
    http.verify();
  });

  it('ouvre le restaurant du compte sans lister les autres', () => {
    // Un restaurateur n'a pas le droit d'appeler GET /api/admin/restaurants (le backend
    // le refuse) : son restaurant vient de son identité, pas d'une liste.
    http.expectOne(LIST_URL).flush([summary('r-1', 'Chez Karta')]);
    navigate.calls.reset();

    TestBed.inject(AuthService).identity.set({
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-9',
    });
    const restaurateur = TestBed.createComponent(RestaurantPickerComponent);
    restaurateur.detectChanges();

    http.expectNone(LIST_URL);
    expect(navigate).toHaveBeenCalledWith(['/app', 'r-9', 'carte'], { replaceUrl: true });
    restaurateur.destroy();
  });

  it('ouvre directement la carte quand il n’y a qu’un restaurant', () => {
    http.expectOne(LIST_URL).flush([summary('r-1', 'Chez Karta')]);

    expect(navigate).toHaveBeenCalledWith(['/app', 'r-1', 'carte'], { replaceUrl: true });
  });

  it('propose un choix minimal quand il y en a plusieurs, sans compteur ni gestion', () => {
    http.expectOne(LIST_URL).flush([summary('r-1', 'Chez Karta'), summary('r-2', 'Le Second')]);
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Chez Karta');
    expect(html).toContain('Le Second');
    // Ce n'est pas un tableau de bord : aucun vocabulaire de back-office.
    expect(html).not.toContain('Clients');
    expect(html).not.toContain('scans');
  });

  it('affiche une erreur récupérable si la liste échoue', () => {
    http.expectOne(LIST_URL).flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Impossible de charger votre restaurant.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Réessayer');
  });
});
