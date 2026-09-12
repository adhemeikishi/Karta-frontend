import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { RestaurantContextService } from './restaurant-context.service';
import { RestaurateurShellComponent } from './restaurateur-shell.component';

@Component({ selector: 'app-stub-carte', standalone: true, template: 'contenu' })
class StubCarteComponent {}

/**
 * Critère de fin de la phase 1 : le restaurateur ne voit jamais le back-office. Ces
 * tests montent le châssis par le routeur réel et vérifient ce que l'écran affiche —
 * pas seulement ce que le code prétend faire.
 */
describe('RestaurateurShellComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  async function navigate(): Promise<HTMLElement> {
    // Session ouverte : le contexte restaurant ne survit pas hors session (voir
    // RestaurantContextService), et le châssis n'existe que connecté.
    TestBed.inject(AuthService).setCredentials('resto@karta.local', 'x', {
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/r-1/carte');
    http.expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-1`).flush({
      id: 'r-1',
      name: 'Chez Karta',
      offer: 'PRO',
      onboardingCompletedAt: '2026-01-01T10:00:00Z',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    });
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'app/:restaurantId',
            component: RestaurateurShellComponent,
            children: [{ path: 'carte', component: StubCarteComponent }],
          },
          { path: 'login', component: StubCarteComponent },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(RestaurantContextService).clear();
    sessionStorage.clear();
  });

  it('charge le restaurant de l’URL et affiche son nom', async () => {
    const el = await navigate();
    expect(el.textContent).toContain('Chez Karta');
    expect(TestBed.inject(RestaurantContextService).restaurantId()).toBe('r-1');
  });

  it('affiche le contenu de la page enfant', async () => {
    const el = await navigate();
    expect(el.textContent).toContain('contenu');
  });

  it('n’emploie aucun vocabulaire de back-office', async () => {
    const el = await navigate();
    for (const word of [
      'Clients',
      'Pilotage',
      'Gestion',
      'Administration',
      'Back-office',
      'Dashboard',
      'Offre',
    ]) {
      expect(el.textContent).not.toContain(word);
    }
  });

  it('n’a pas la barre latérale du back-office', async () => {
    const el = await navigate();
    expect(el.querySelector('.sidebar')).toBeNull();
    expect(el.querySelector('.topbar')).toBeNull();
  });

  it('mène à chaque destination en conservant le restaurantId', async () => {
    const el = await navigate();
    for (const label of ['Ma carte', 'Contenu', 'Apparence', 'Mon QR code', 'Statistiques']) {
      expect(el.textContent).toContain(label);
    }

    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).toContain('/app/r-1/carte');
    expect(hrefs).toContain('/app/r-1/apparence');
    expect(hrefs).toContain('/app/r-1/qr');
    expect(hrefs).toContain('/app/r-1/statistiques');
    // Aucun lien ne doit ramener au back-office.
    expect(hrefs.some((h) => h.startsWith('/admin'))).toBeFalse();
  });

  it("n'annonce aucune destination qui ne mène nulle part", async () => {
    const el = await navigate();
    // Un élément de navigation non cliquable est une promesse : il ne doit pas exister.
    const links = Array.from(el.querySelectorAll('.app-nav-link'));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const reachable = link.tagName === 'A' ? link.hasAttribute('href') : link.tagName === 'BUTTON';
      expect(reachable).withContext(link.textContent ?? '').toBeTrue();
    }
    expect(el.textContent).not.toContain('bientôt');
  });

  it('déconnecte et renvoie vers /login', async () => {
    await navigate();
    const auth = TestBed.inject(AuthService);
    auth.setCredentials('u', 'p', {
      username: 'u',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });

    const shell = harness.routeDebugElement!.componentInstance as RestaurateurShellComponent;
    shell.logout();
    await harness.fixture.whenStable();

    expect(auth.isAuthenticated()).toBeFalse();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('propose de réessayer si le restaurant ne charge pas, sans casser le châssis', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/r-1/carte');
    http
      .expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-1`)
      .flush('', { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Impossible de charger votre restaurant.');
    expect(el.textContent).toContain('Réessayer');
    expect(el.textContent).toContain('Ma carte');
  });
});
