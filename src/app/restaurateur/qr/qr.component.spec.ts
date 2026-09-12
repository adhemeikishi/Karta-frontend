import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { QrCode } from '../../models/qr-code.model';
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
