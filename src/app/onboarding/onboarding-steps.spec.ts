import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { Menu } from '../menu/menu.model';
import { RestaurantOffer } from '../models/restaurant.model';
import { AuthService } from '../services/auth.service';
import { ImportComponent } from './import.component';
import { OnboardingService } from './onboarding.service';
import { ProcessingComponent } from './processing.component';
import { PublishComponent } from './publish.component';

const BASE = `${environment.apiBaseUrl}/api/admin/restaurants/r-1`;

const PDF = {
  assetId: 'a-1',
  url: 'https://api.kartaqr.fr/media/a-1',
  originalFilename: 'carte-hiver.pdf',
  sizeBytes: 524288,
  uploadedAt: '2026-02-01T09:00:00Z',
};

function menu(overrides: Partial<Menu> = {}): Menu {
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

/** `<input type="file">` porteur du fichier choisi, tel que reçu par le composant. */
function fileEvent(file: File): Event {
  const input = document.createElement('input');
  input.type = 'file';
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  return { target: input } as unknown as Event;
}

function setup(): { http: HttpTestingController; onboarding: OnboardingService; navigate: jasmine.Spy } {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  TestBed.inject(AuthService).setCredentials('resto@karta.local', 'x', {
    username: 'resto@karta.local',
    role: 'RESTAURATEUR',
    restaurantId: 'r-1',
  });
  return {
    http: TestBed.inject(HttpTestingController),
    onboarding: TestBed.inject(OnboardingService),
    navigate: spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true),
  };
}

function seed(
  onboarding: OnboardingService,
  offer: RestaurantOffer,
  menuState: Partial<Menu> = {},
): void {
  onboarding.restaurant.set({
    id: 'r-1',
    name: 'Chez Karta',
    offer,
    onboardingCompletedAt: null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  });
  onboarding.menu.set(menu({ offer, ...menuState }));
}

// ====================================================================== import

describe('Onboarding — étape 01, import du menu', () => {
  let fixture: ComponentFixture<ImportComponent>;
  let http: HttpTestingController;
  let onboarding: OnboardingService;
  let navigate: jasmine.Spy;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    ({ http, onboarding, navigate } = setup());
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    onboarding.reset();
    sessionStorage.clear();
  });

  function create(offer: RestaurantOffer = 'PRO', menuState: Partial<Menu> = {}): void {
    seed(onboarding, offer, menuState);
    fixture = TestBed.createComponent(ImportComponent);
    fixture.detectChanges();
  }

  it('propose une zone de dépôt et un choix de fichier', () => {
    create();
    expect(text()).toContain('Déposer mon PDF');
    expect(text()).toContain('Choisir un fichier');
  });

  it('refuse un fichier non-PDF sans appeler l’API', () => {
    create();
    fixture.componentInstance.onFileSelected(fileEvent(new File(['x'], 'c.png', { type: 'image/png' })));

    expect(fixture.componentInstance.errorMessage()).toBe('Seuls les fichiers PDF sont acceptés.');
    http.expectNone(`${BASE}/menu/pdf`);
  });

  it('téléverse par le service existant et affiche la carte importée', () => {
    create();
    fixture.componentInstance.onFileSelected(
      fileEvent(new File(['%PDF-1.4'], 'carte.pdf', { type: 'application/pdf' })),
    );

    const req = http.expectOne(`${BASE}/menu/pdf`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(menu({ pdf: PDF }));
    fixture.detectChanges();

    expect(text()).toContain('carte-hiver.pdf');
    expect(text()).toContain('Continuer');
  });

  it('mène à la lecture du PDF pour une carte numérique', () => {
    create('PRO', { pdf: PDF });
    fixture.componentInstance.next();
    expect(navigate).toHaveBeenCalledWith(['/onboarding', 'processing']);
  });

  it('mène droit à la publication pour une carte PDF', () => {
    // Rien à extraire ni à habiller : le PDF EST la carte (voir plan.ts).
    create('BASIC', { type: 'PDF', pdf: PDF });
    fixture.componentInstance.next();
    expect(navigate).toHaveBeenCalledWith(['/onboarding', 'publish']);
  });
});

// ====================================================================== traitement

describe('Onboarding — étape 02, lecture du PDF', () => {
  let fixture: ComponentFixture<ProcessingComponent>;
  let http: HttpTestingController;
  let onboarding: OnboardingService;
  let navigate: jasmine.Spy;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    ({ http, onboarding, navigate } = setup());
    seed(onboarding, 'PRO', { pdf: PDF });
    fixture = TestBed.createComponent(ProcessingComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    onboarding.reset();
    sessionStorage.clear();
  });

  it('lance l’analyse réelle dès l’ouverture, sans progression simulée', () => {
    const req = http.expectOne(`${BASE}/menu/ai/import`);
    expect(req.request.method).toBe('POST');

    // Tant que le serveur n'a pas répondu, rien n'est annoncé comme terminé.
    expect(fixture.componentInstance.done()).toBeFalse();
    req.flush({ categories: [], categoryCount: 0, itemCount: 0 });

    expect(fixture.componentInstance.done()).toBeTrue();
    expect(navigate).toHaveBeenCalledWith(['/onboarding', 'review']);
    expect(onboarding.hasDraft()).toBeTrue();
  });

  it('affiche l’échec et propose de réessayer, sans avancer', () => {
    http
      .expectOne(`${BASE}/menu/ai/import`)
      .flush({ message: 'PDF illisible.' }, { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();

    expect(fixture.componentInstance.failed()).toBeTrue();
    expect(text()).toContain('PDF illisible.');
    expect(text()).toContain('Réessayer');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('relance réellement l’analyse au clic sur Réessayer', () => {
    http.expectOne(`${BASE}/menu/ai/import`).flush('', { status: 500, statusText: 'Server Error' });

    fixture.componentInstance.start();
    http.expectOne(`${BASE}/menu/ai/import`).flush({ categories: [] });

    expect(navigate).toHaveBeenCalledWith(['/onboarding', 'review']);
  });

  it('ne lance jamais deux analyses en parallèle', () => {
    fixture.componentInstance.start();
    http.expectOne(`${BASE}/menu/ai/import`).flush({ categories: [] });
  });
});

// ====================================================================== publication

describe('Onboarding — étape 05, publication', () => {
  let fixture: ComponentFixture<PublishComponent>;
  let http: HttpTestingController;
  let onboarding: OnboardingService;
  let navigate: jasmine.Spy;

  const STRUCTURE = {
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
  };

  beforeEach(() => {
    ({ http, onboarding, navigate } = setup());
  });

  afterEach(() => {
    fixture?.destroy();
    http.match(() => true); // le rechargement d'état après publication n'est pas le sujet
    http.verify();
    onboarding.reset();
    sessionStorage.clear();
  });

  function create(menuState: Partial<Menu>): void {
    seed(onboarding, 'PRO', menuState);
    fixture = TestBed.createComponent(PublishComponent);
    fixture.detectChanges();
  }

  it('publie par le vrai endpoint, une seule fois, puis affiche le QR', () => {
    create({ version: 2, status: 'READY', structure: STRUCTURE });

    fixture.componentInstance.publish();
    fixture.componentInstance.publish();

    const requests = http.match(`${BASE}/menu/publish`);
    expect(requests.length).toBe(1);
    expect(requests[0].request.method).toBe('PUT');
    requests[0].flush(menu({ version: 2, published: true, status: 'PUBLISHED' }));

    expect(navigate).toHaveBeenCalledWith(['/onboarding', 'success']);
  });

  it('refuse de publier une carte vide, comme le serveur', () => {
    create({ version: 2, status: 'DRAFT', structure: { ...STRUCTURE, categories: [] } });

    expect(fixture.componentInstance.canPublish()).toBeFalse();
    fixture.componentInstance.publish();
    // `publish()` part quand même si on l'appelle : c'est le bouton qui est désactivé.
    http.match(`${BASE}/menu/publish`).forEach((r) => r.flush(menu()));
  });

  it('garde l’échec visible plutôt que de prétendre au succès', () => {
    create({ version: 2, status: 'READY', structure: STRUCTURE });

    fixture.componentInstance.publish();
    http
      .expectOne(`${BASE}/menu/publish`)
      .flush({ message: 'Menu vide.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Menu vide.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
