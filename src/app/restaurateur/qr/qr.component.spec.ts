import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { QrCode } from '../../models/qr-code.model';
import { RestaurantOffer } from '../../models/restaurant.model';
import { AuthService } from '../../services/auth.service';
import { RestaurantContextService } from '../restaurant-context.service';
import { QrComponent } from './qr.component';

const BASE = `${environment.apiBaseUrl}/api/admin/restaurants/r-1`;

const QR: QrCode = {
  id: 'qr-1',
  restaurantId: 'r-1',
  name: 'Chez Karta',
  destinationUrl: 'https://kartaqr.fr/m/V3QK5ZF75A',
  code: 'V3QK5ZF75A',
  redirectUrl: 'https://kartaqr.fr/q/V3QK5ZF75A',
  active: true,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

/** Un PNG minuscule mais réel : `readAsDataURL` doit avoir quelque chose à lire. */
function pngBlob(): Blob {
  return new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
}

describe('QrComponent', () => {
  let fixture: ComponentFixture<QrComponent>;
  let http: HttpTestingController;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [QrComponent],
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
    fixture = TestBed.createComponent(QrComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('demande le QR du restaurant, jamais la route générique interdite au restaurateur', () => {
    // `/api/admin/qr-codes/**` est refusé à un compte restaurateur : rien dans son chemin
    // ne dit à quel restaurant le QR appartient (voir RestaurateurScopeFilter).
    const list = http.expectOne(`${BASE}/qr-codes`);
    const image = http.expectOne(`${BASE}/qr-code/image.png`);
    expect(list.request.method).toBe('GET');
    expect(image.request.method).toBe('GET');
    expect(image.request.responseType).toBe('blob');

    list.flush([QR]);
    image.flush(pngBlob());

    http.expectNone((r) => r.url.includes('/api/admin/qr-codes/'));
  });

  it("affiche l'adresse réellement encodée dans le QR", () => {
    http.expectOne(`${BASE}/qr-codes`).flush([QR]);
    http.expectOne(`${BASE}/qr-code/image.png`).flush(pngBlob());
    fixture.detectChanges();

    expect(fixture.componentInstance.menuUrl()).toBe('https://kartaqr.fr/q/V3QK5ZF75A');
    expect(text()).toContain('https://kartaqr.fr/q/V3QK5ZF75A');
  });

  it('propose PNG et SVG, et ne télécharge rien tant que le QR n’est pas chargé', () => {
    http.expectOne(`${BASE}/qr-codes`).flush([QR]);
    http.expectOne(`${BASE}/qr-code/image.png`).flush(pngBlob());

    fixture.componentInstance.download('svg');
    const svg = http.expectOne(`${BASE}/qr-code/image.svg`);
    expect(svg.request.responseType).toBe('blob');
    svg.flush(new Blob(['<svg/>'], { type: 'image/svg+xml' }));
    expect(fixture.componentInstance.downloading()).toBeNull();
  });

  it('empêche deux téléchargements simultanés', () => {
    http.expectOne(`${BASE}/qr-codes`).flush([QR]);
    http.expectOne(`${BASE}/qr-code/image.png`).flush(pngBlob());

    fixture.componentInstance.download('png');
    fixture.componentInstance.download('png');

    http.expectOne(`${BASE}/qr-code/image.png`).flush(pngBlob());
  });

  it('reste récupérable quand l’image échoue', () => {
    http.expectOne(`${BASE}/qr-codes`).flush([QR]);
    // Corps en Blob même en erreur : la requête est en `responseType: 'blob'`, et
    // HttpTestingController refuse de convertir une chaîne pour ce type.
    http
      .expectOne(`${BASE}/qr-code/image.png`)
      .flush(new Blob(), { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeTrue();
    expect(text()).toContain("Le QR code n'a pas pu être chargé.");
    expect(text()).toContain('Réessayer');
  });
});

/**
 * Personnalisation du QR : réservée à Premium, éditée dans le même document que
 * l'apparence de la carte, aperçu sans écriture.
 */
describe('QrComponent — personnalisation Premium', () => {
  let fixture: ComponentFixture<QrComponent>;
  let http: HttpTestingController;

  function design(offer: RestaurantOffer) {
    return {
      offer,
      customizable: offer === 'PREMIUM',
      preset: 'MODERN',
      presets: [],
      fonts: [],
      customization: {
        brandName: null,
        primaryColor: null,
        secondaryColor: null,
        logoAssetId: null,
        logoUrl: null,
        heroAssetId: null,
        heroUrl: null,
        hideBranding: false,
        font: null,
        languages: [],
        qr: { fgColor: null, bgColor: null, moduleStyle: null, eyeStyle: null, logoAssetId: null, logoUrl: null },
      },
    };
  }

  function mount(offer: RestaurantOffer): void {
    TestBed.configureTestingModule({
      imports: [QrComponent],
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
    TestBed.inject(AuthService).setCredentials('resto@karta.local', 'x', {
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });
    TestBed.inject(RestaurantContextService).restaurant.set({
      id: 'r-1',
      name: 'Chez Karta',
      offer,
      onboardingCompletedAt: '2026-01-01T10:00:00Z',
      kartaPayEnabled: false,
      subscriptionActive: true,
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(QrComponent);
    fixture.detectChanges();
    http.expectOne(`${BASE}/qr-codes`).flush([QR]);
    http.expectOne(`${BASE}/qr-code/image.png`).flush(pngBlob());
  }

  afterEach(() => {
    fixture.destroy();
    http.verify();
    TestBed.inject(RestaurantContextService).clear();
    sessionStorage.clear();
  });

  it('en PRO : annonce la fonctionnalité verrouillée, sans charger ni proposer les réglages', () => {
    mount('PRO');
    fixture.detectChanges();

    http.expectNone(`${BASE}/menu/design`);
    expect(fixture.componentInstance.canDesign()).toBeFalse();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('QR code personnalisable');
    expect(text).toContain('Découvrir Premium');
    expect(text).not.toContain('Couleur des modules');
  });

  it("en PREMIUM : chaque réglage rafraîchit l'aperçu par le serveur, sans rien enregistrer", fakeAsync(() => {
    mount('PREMIUM');
    http.expectOne(`${BASE}/menu/design`).flush(design('PREMIUM'));
    fixture.detectChanges();
    tick(200);
    // L'état enregistré est déjà affiché : aucun second aperçu au chargement.
    http.expectNone((r) => r.url === `${BASE}/qr-code/image.png`);

    fixture.componentInstance.setModuleStyle('DOTS');
    fixture.componentInstance.setHideBranding(true);
    // `toObservable` s'appuie sur un effect : il court avec la détection de changements.
    fixture.detectChanges();
    tick(200);

    const preview = http.expectOne((r) => r.url === `${BASE}/qr-code/image.png`);
    expect(preview.request.params.get('moduleStyle')).toBe('DOTS');
    expect(preview.request.params.get('hideBranding')).toBe('true');
    expect(preview.request.params.get('fgColor')).toBe('#000000');
    preview.flush(pngBlob());
    tick();

    expect(fixture.componentInstance.dirty()).toBeTrue();
    http.expectNone((r) => r.method === 'PUT');
  }));

  it("en PREMIUM : enregistrer envoie le document complet du design, et le téléchargement suit l'aperçu", fakeAsync(() => {
    mount('PREMIUM');
    http.expectOne(`${BASE}/menu/design`).flush(design('PREMIUM'));
    fixture.detectChanges();
    tick(200);

    fixture.componentInstance.setFgColor('#012fa4');
    fixture.detectChanges();
    tick(200);
    http.expectOne((r) => r.url === `${BASE}/qr-code/image.png`).flush(pngBlob());
    tick();

    fixture.componentInstance.download('svg');
    const svg = http.expectOne((r) => r.url === `${BASE}/qr-code/image.svg`);
    expect(svg.request.params.get('fgColor')).toBe('#012FA4');
    svg.flush(new Blob(['<svg/>'], { type: 'image/svg+xml' }));

    fixture.componentInstance.save();
    const put = http.expectOne(`${BASE}/menu/design`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.qrFgColor).toBe('#012FA4');
    expect(put.request.body.preset).toBe('MODERN');
    put.flush({ ...design('PREMIUM'), customization: { ...design('PREMIUM').customization, qr: { ...design('PREMIUM').customization.qr, fgColor: '#012FA4' } } });
    fixture.detectChanges();
    tick(200);

    expect(fixture.componentInstance.dirty()).toBeFalse();
    expect(fixture.componentInstance.justSaved()).toBeTrue();
  }));

  it('prévient quand les couleurs rendraient le QR illisible', fakeAsync(() => {
    mount('PREMIUM');
    http.expectOne(`${BASE}/menu/design`).flush(design('PREMIUM'));
    fixture.detectChanges();
    tick(200);

    expect(fixture.componentInstance.scannable()).toBeTrue();
    fixture.componentInstance.setFgColor('#FFFF00');
    expect(fixture.componentInstance.scannable()).toBeFalse();
    fixture.detectChanges();
    tick(200);
    http.expectOne((r) => r.url === `${BASE}/qr-code/image.png`).flush(pngBlob());
    tick();
  }));
});
