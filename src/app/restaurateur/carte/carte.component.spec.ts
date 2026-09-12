import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Menu } from '../../menu/menu.model';
import { CarteComponent } from './carte.component';

const BASE = `${environment.apiBaseUrl}/api/admin/restaurants/r-1`;

function menu(overrides: Partial<Menu> = {}): Menu {
  return {
    offer: 'PRO',
    type: 'PDF',
    status: 'DRAFT',
    version: 1,
    published: false,
    publishedAt: null,
    pdf: null,
    structure: null,
    ...overrides,
  };
}

/** Carte numérique réellement enregistrée : `version > 1` (voir hasStructuredContent). */
function structuredMenu(overrides: Partial<Menu> = {}): Menu {
  return menu({
    type: 'STRUCTURED',
    status: 'READY',
    version: 2,
    pdf: PDF,
    structure: {
      restaurantName: 'Chez Karta',
      currency: 'EUR',
      categories: [
        {
          id: 'c1',
          name: 'Entrées',
          description: null,
          sortOrder: 0,
          visible: true,
          items: [
            {
              id: 'i1',
              name: 'Velouté',
              description: null,
              price: 890,
              currency: 'EUR',
              imageAssetId: null,
              imageUrl: null,
              sortOrder: 0,
              available: true,
            },
          ],
        },
      ],
    },
    ...overrides,
  });
}

const PDF = {
  assetId: 'a-1',
  url: 'https://api.kartaqr.fr/media/a-1',
  originalFilename: 'carte-hiver.pdf',
  sizeBytes: 524288,
  uploadedAt: '2026-02-01T09:00:00Z',
};

describe('CarteComponent — Ma carte', () => {
  let fixture: ComponentFixture<CarteComponent>;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function create(): void {
    fixture = TestBed.createComponent(CarteComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CarteComponent],
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
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  /**
   * L'aperçu de la page (apparence enregistrée puis rendu réel) part en tâche de fond
   * dès qu'une carte structurée existe. `match()` le retire de la file de vérification
   * sans le servir : un test dédié vérifie qu'il part bien.
   */
  function drainPreview(): void {
    http.match((r) => r.url.endsWith('/menu/design') || r.url.endsWith('/menu/preview'));
  }

  afterEach(() => {
    fixture?.destroy();
    drainPreview();
    http.verify();
  });

  // ---------------------------------------------------------------- chargement

  it('affiche un squelette pendant le chargement de la carte', () => {
    create();
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.skeleton')).not.toBeNull();
    http.expectOne(`${BASE}/menu`).flush(menu());
  });

  it('affiche une erreur récupérable si la carte ne charge pas', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain('Impossible de charger votre carte.');
    expect(text()).toContain('Réessayer');
  });

  // ---------------------------------------------------------------- PDF

  it('invite à importer un PDF quand il n’y en a pas', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu());
    fixture.detectChanges();

    expect(text()).toContain('Importez votre carte au format PDF');
    expect(text()).toContain('Choisir un fichier PDF');
    // Sans PDF, KartaIA n'a rien à analyser : le bouton ne doit pas exister.
    expect(text()).not.toContain('Importer avec KartaIA');
  });

  it('affiche le PDF importé (nom, taille) et ses actions', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ pdf: PDF }));
    fixture.detectChanges();

    expect(text()).toContain('carte-hiver.pdf');
    expect(text()).toContain('512 Ko');
    expect(text()).toContain('Remplacer');
    expect(text()).toContain('Supprimer');
  });

  it('refuse un fichier non-PDF sans appeler l’API', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu());

    const file = new File(['x'], 'carte.png', { type: 'image/png' });
    fixture.componentInstance.onFileSelected(fileEvent(file));

    expect(fixture.componentInstance.pdfError()).toBe('Seuls les fichiers PDF sont acceptés.');
    http.expectNone(`${BASE}/menu/pdf`);
  });

  it('téléverse le PDF par MenuService.uploadPdf et met la carte à jour', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu());

    const file = new File(['%PDF-1.4'], 'carte.pdf', { type: 'application/pdf' });
    fixture.componentInstance.onFileSelected(fileEvent(file));
    expect(fixture.componentInstance.pdfBusy()).toBeTrue();

    const req = http.expectOne(`${BASE}/menu/pdf`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(menu({ pdf: PDF }));

    expect(fixture.componentInstance.pdfBusy()).toBeFalse();
    expect(fixture.componentInstance.pdf()).toEqual(PDF);
  });

  // ---------------------------------------------------------------- KartaIA

  it('propose KartaIA dès qu’un PDF est présent et mène à la Review restaurateur', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ pdf: PDF }));
    fixture.detectChanges();
    expect(text()).toContain('Importer avec KartaIA');

    fixture.componentInstance.analyze();
    expect(fixture.componentInstance.analyzing()).toBeTrue();

    const req = http.expectOne(`${BASE}/menu/ai/import`);
    expect(req.request.method).toBe('POST');
    req.flush({ categories: [], categoryCount: 0, itemCount: 0 });

    // Jamais /admin : le restaurateur reste dans son espace.
    expect(navigate).toHaveBeenCalledWith(['/app', 'r-1', 'carte', 'review']);
  });

  it('empêche le double-clic pendant l’analyse', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ pdf: PDF }));

    fixture.componentInstance.analyze();
    fixture.componentInstance.analyze();

    http.expectOne(`${BASE}/menu/ai/import`).flush({});
  });

  it('garde l’échec d’analyse visible plutôt que silencieux', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ pdf: PDF }));

    fixture.componentInstance.analyze();
    http
      .expectOne(`${BASE}/menu/ai/import`)
      .flush({ message: 'PDF illisible.' }, { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();

    expect(fixture.componentInstance.analyzing()).toBeFalse();
    expect(text()).toContain('PDF illisible.');
    expect(navigate).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- carte prête

  it('annonce une carte prête sans jamais la publier', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(
      menu({
        type: 'STRUCTURED',
        status: 'READY',
        version: 2,
        pdf: PDF,
        structure: {
          restaurantName: 'Chez Karta',
          currency: 'EUR',
          categories: [
            {
              id: 'c1',
              name: 'Entrées',
              description: null,
              sortOrder: 0,
              visible: true,
              items: [
                {
                  id: 'i1',
                  name: 'Velouté',
                  description: null,
                  price: 890,
                  currency: 'EUR',
                  imageAssetId: null,
                  imageUrl: null,
                  sortOrder: 0,
                  available: true,
                },
              ],
            },
          ],
        },
      }),
    );
    fixture.detectChanges();

    expect(text()).toContain('Votre carte est prête.');
    expect(text()).toContain('Prête à publier');
    expect(fixture.componentInstance.hasStructure()).toBeTrue();
    expect(fixture.componentInstance.categoryCount()).toBe(1);
    expect(fixture.componentInstance.itemCount()).toBe(1);
    // Save ≠ Publish : aucun appel de publication ne part de cet écran.
    http.expectNone(`${BASE}/menu/publish`);
    expect(text()).not.toContain('Publier');
    // Une carte déjà structurée n'a plus à repasser par KartaIA.
    expect(fixture.componentInstance.canAnalyze()).toBeFalse();
  });

  it("affiche l'aperçu du rendu réel dès qu'une carte structurée existe", () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(structuredMenu());
    fixture.detectChanges();

    // Apparence enregistrée puis HTML du renderer backend — jamais un menu reconstruit.
    http.expectOne(`${BASE}/menu/design`).flush({
      offer: 'PRO',
      customizable: false,
      preset: 'MODERN',
      presets: [],
      customization: {
        brandName: null,
        primaryColor: null,
        secondaryColor: null,
        logoAssetId: null,
        logoUrl: null,
        heroAssetId: null,
        heroUrl: null,
      },
    });
    const preview = http.expectOne((r) => r.url === `${BASE}/menu/preview`);
    expect(preview.request.method).toBe('GET');
    preview.flush('<html>carte</html>');

    expect(fixture.componentInstance.previewError()).toBeFalse();
  });

  it("ne demande aucun aperçu tant qu'il n'y a rien à montrer", () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ pdf: PDF }));
    fixture.detectChanges();

    http.expectNone(`${BASE}/menu/design`);
    http.expectNone((r) => r.url.endsWith('/menu/preview'));
  });

  it('ne considère pas un simple choix de style comme une carte créée (version 1)', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ type: 'STRUCTURED', version: 1 }));
    expect(fixture.componentInstance.hasStructure()).toBeFalse();
  });

  // ---------------------------------------------------------------- vocabulaire

  it('n’affiche aucun vocabulaire de back-office', () => {
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ pdf: PDF }));
    fixture.detectChanges();

    for (const word of ['Clients', 'Pilotage', 'Administration', 'Offre', 'Dashboard']) {
      expect(text()).not.toContain(word);
    }
  });
});

/** `<input type="file">` porteur du fichier choisi, tel que reçu par le composant. */
function fileEvent(file: File): Event {
  const input = document.createElement('input');
  input.type = 'file';
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  return { target: input } as unknown as Event;
}
