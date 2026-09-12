import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { MenuDesignStudioComponent } from '../../menu/design/menu-design-studio.component';
import { MenuDesign } from '../../menu/design/menu-design.model';
import { Menu } from '../../menu/menu.model';
import { RestaurantOffer } from '../../models/restaurant.model';
import { AuthService } from '../../services/auth.service';
import { RestaurantContextService } from '../restaurant-context.service';
import { ApparenceComponent } from './apparence.component';

const BASE = `${environment.apiBaseUrl}/api/admin/restaurants/r-1`;

/** Les 5 presets réels, tels que le backend les renvoie (MenuPreset.java). */
const PRESETS: MenuDesign['presets'] = [
  { id: 'MODERN', label: 'Modern', background: '#FFFFFF', accent: '#F05A00', text: '#131312' },
  { id: 'DARK', label: 'Dark', background: '#131312', accent: '#012FA4', text: '#FFFFFF' },
  {
    id: 'STREET_FOOD',
    label: 'Street Food',
    background: '#131312',
    accent: '#DC2626',
    text: '#FFFFFF',
  },
  { id: 'MINIMAL', label: 'Minimal', background: '#FFFFFF', accent: '#131312', text: '#131312' },
  { id: 'LUXE', label: 'Luxe', background: '#131312', accent: '#C9A96E', text: '#F5EDD8' },
];

function design(overrides: Partial<MenuDesign> = {}): MenuDesign {
  return {
    offer: 'PRO',
    customizable: false,
    preset: 'MODERN',
    presets: PRESETS,
    customization: {
      brandName: null,
      primaryColor: null,
      secondaryColor: null,
      logoAssetId: null,
      logoUrl: null,
      heroAssetId: null,
      heroUrl: null,
    },
    ...overrides,
  };
}

function menu(overrides: Partial<Menu> = {}): Menu {
  return {
    offer: 'PRO',
    type: 'STRUCTURED',
    status: 'READY',
    version: 2,
    published: false,
    publishedAt: null,
    pdf: null,
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
  };
}

describe('ApparenceComponent', () => {
  let fixture: ComponentFixture<ApparenceComponent>;
  let http: HttpTestingController;
  let context: RestaurantContextService;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** Le châssis a déjà chargé le restaurant : la page n'a pas à le refaire. */
  function withRestaurant(offer: RestaurantOffer = 'PRO'): void {
    // Le contexte appartient à la session : sans compte connecté il se vide de lui-même
    // (voir RestaurantContextService). C'est exactement ce qu'on veut en production.
    TestBed.inject(AuthService).setCredentials('resto@karta.local', 'x', {
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });
    context.restaurant.set({
      id: 'r-1',
      name: 'Chez Karta',
      offer,
      onboardingCompletedAt: '2026-01-01T10:00:00Z',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    });
  }

  function create(): void {
    fixture = TestBed.createComponent(ApparenceComponent);
    fixture.detectChanges();
  }

  /** Page + studio montés, requêtes initiales servies. */
  function mounted(): MenuDesignStudioComponent {
    withRestaurant();
    create();
    http.expectOne(`${BASE}/menu`).flush(menu());
    fixture.detectChanges(); // le studio n'est monté qu'une fois le menu disponible
    http.expectOne(`${BASE}/menu/design`).flush(design());
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(MenuDesignStudioComponent))
      .componentInstance as MenuDesignStudioComponent;
  }

  /**
   * L'aperçu du studio est un effet de bord débouncé (160 ms) : selon la vitesse de la
   * machine il peut partir pendant n'importe quel test. Le drainer garde les
   * assertions déterministes — un test dédié vérifie qu'il part bien.
   */
  function drainPreview(): void {
    // `match()` retire les requêtes de la file de vérification sans les servir : on ne
    // peut pas les `flush()` après destruction du composant (elles sont annulées).
    http.match((r) => r.url.endsWith('/menu/preview'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApparenceComponent],
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
    context = TestBed.inject(RestaurantContextService);
  });

  afterEach(() => {
    // Détruire avant de vérifier : la pipeline d'aperçu du studio est débouncée
    // (160 ms) et `takeUntilDestroyed` doit l'annuler, sinon une requête en retard
    // tomberait dans le test suivant.
    fixture?.destroy();
    drainPreview();
    http.verify();
    context.clear();
    sessionStorage.clear();
  });

  // ---------------------------------------------------------------- contexte

  it('utilise le restaurant du châssis sans le recharger', () => {
    mounted();

    // Aucun GET /restaurants/r-1 : le contexte du châssis fait foi.
    http.expectNone(`${environment.apiBaseUrl}/api/admin/restaurants/r-1`);
    expect(fixture.componentInstance.restaurantId).toBe('r-1');
    // Le nom du restaurant est porté par la navigation, pas répété en tête de page ;
    // ce que la page tire du contexte, c'est l'offre transmise au studio.
    expect(fixture.componentInstance.restaurant()?.name).toBe('Chez Karta');
    expect(text()).toContain('Votre offre PRO');
  });

  // ---------------------------------------------------------------- chargement

  it('charge le menu puis le design, une seule fois chacun', () => {
    withRestaurant();
    create();
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(text()).toContain("Chargement de l'apparence");

    http.expectOne(`${BASE}/menu`).flush(menu());
    fixture.detectChanges();
    http.expectOne(`${BASE}/menu/design`).flush(design());
    fixture.detectChanges();

    // Un cycle de détection supplémentaire ne doit rien redemander.
    fixture.detectChanges();
    http.expectNone(`${BASE}/menu`);
    http.expectNone(`${BASE}/menu/design`);
  });

  it('affiche une erreur compréhensible, sans détail technique', () => {
    withRestaurant();
    create();
    http.expectOne(`${BASE}/menu`).flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain("Impossible de charger l'apparence de votre carte.");
    expect(text()).toContain('Réessayer');
    expect(text()).not.toContain('500');
    expect(text()).not.toContain('Http');
  });

  // ---------------------------------------------------------------- presets

  it('propose exactement les 5 presets réels, issus du backend', () => {
    mounted();

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.preset-label'),
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Modern', 'Dark', 'Street Food', 'Minimal', 'Luxe']);

    for (const absent of ['Classic', 'Bistro', 'Premium Modern']) {
      expect(text()).not.toContain(absent);
    }
  });

  // ---------------------------------------------------------------- offre BASIC

  it("explique l'absence d'habillage pour une carte PDF au lieu de laisser échouer", () => {
    withRestaurant('BASIC');
    create();
    http.expectOne(`${BASE}/menu`).flush(menu({ type: 'PDF', offer: 'BASIC' }));
    fixture.detectChanges();

    expect(text()).toContain('Votre carte est diffusée en PDF');
    // Le studio n'est pas monté : pas de GET design, donc pas de PUT voué à échouer.
    http.expectNone(`${BASE}/menu/design`);
  });

  // ---------------------------------------------------------------- vocabulaire

  it("n'emploie aucun vocabulaire de back-office", () => {
    mounted();
    for (const word of ['ce client', 'du client', 'Clients', 'Pilotage', 'Back-office']) {
      expect(text()).not.toContain(word);
    }
  });

  // ---------------------------------------------------------------- enregistrement

  it("n'envoie qu'un seul PUT malgré un double-clic sur Enregistrer", () => {
    const studio = mounted();
    studio.selectPreset('LUXE');
    fixture.detectChanges();
    expect(studio.dirty()).toBeTrue();

    studio.save();
    studio.save();

    const requests = http.match(`${BASE}/menu/design`);
    expect(requests.length).toBe(1);
    expect(requests[0].request.method).toBe('PUT');
    expect(requests[0].request.body.preset).toBe('LUXE');
    requests[0].flush(design({ preset: 'LUXE' }));

    expect(studio.saving()).toBeFalse();
    expect(studio.justSaved()).toBeTrue();
    expect(studio.dirty()).toBeFalse();
  });

  it("affiche une erreur d'enregistrement au lieu d'un faux succès", () => {
    const studio = mounted();
    studio.selectPreset('DARK');
    studio.save();
    http
      .expectOne(`${BASE}/menu/design`)
      .flush({ message: 'Style refusé.' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(studio.justSaved()).toBeFalse();
    expect(text()).toContain('Style refusé.');
  });

  // ---------------------------------------------------------------- aperçu ≠ publication

  it("l'aperçu interroge le rendu réel et ne publie jamais", () => {
    const studio = mounted();
    drainPreview(); // repart d'une base nette : seul l'aperçu demandé ci-dessous compte

    studio.refreshPreview();

    const preview = http.expectOne((r) => r.url === `${BASE}/menu/preview`);
    expect(preview.request.method).toBe('GET');
    expect(preview.request.params.get('preset')).toBe('MODERN');
    preview.flush('<html>menu</html>');

    http.expectNone(`${BASE}/menu/publish`);
    http.expectNone(`${BASE}/menu/unpublish`);
  });

  it('enregistrer ne publie pas ; publier reste une action distincte et explicite', () => {
    const studio = mounted();
    studio.selectPreset('MINIMAL');
    studio.save();
    http.expectOne(`${BASE}/menu/design`).flush(design({ preset: 'MINIMAL' }));

    // Enregistrer n'a rien mis en ligne.
    http.expectNone(`${BASE}/menu/publish`);

    // La publication existe, mais uniquement quand elle est déclenchée.
    studio.publish();
    const publish = http.expectOne(`${BASE}/menu/publish`);
    expect(publish.request.method).toBe('PUT');
    publish.flush(
      menu({ status: 'PUBLISHED', published: true, publishedAt: '2026-02-02T10:00:00Z' }),
    );
    expect(fixture.componentInstance.menu()?.published).toBeTrue();
  });
});

@Component({ selector: 'app-stub-carte', standalone: true, template: 'Ma carte' })
class StubCarteComponent {}

/**
 * Navigation réelle : un lien relatif (`../carte`) ne se résout qu'avec un arbre de
 * routes, pas avec une `ActivatedRoute` simulée. Ce bloc monte donc la page par le
 * routeur, comme en production.
 */
describe('ApparenceComponent — navigation', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'app/:restaurantId',
            children: [
              { path: 'apparence', component: ApparenceComponent },
              { path: 'carte', component: StubCarteComponent },
            ],
          },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);

    TestBed.inject(AuthService).setCredentials('resto@karta.local', 'x', {
      username: 'resto@karta.local',
      role: 'RESTAURATEUR',
      restaurantId: 'r-1',
    });
    TestBed.inject(RestaurantContextService).restaurant.set({
      id: 'r-1',
      name: 'Chez Karta',
      offer: 'PRO',
      onboardingCompletedAt: '2026-01-01T10:00:00Z',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    });

    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/r-1/apparence');
    http.expectOne(`${BASE}/menu`).flush(menu());
    harness.detectChanges();
    http.expectOne(`${BASE}/menu/design`).flush(design());
    harness.detectChanges();
  });

  afterEach(() => {
    harness.fixture.destroy();
    http.match((r) => r.url.endsWith('/menu/preview'));
    http.verify();
    TestBed.inject(RestaurantContextService).clear();
    sessionStorage.clear();
  });

  it('lit le restaurantId de l’URL', () => {
    const page = harness.routeDebugElement!.componentInstance as ApparenceComponent;
    expect(page.restaurantId).toBe('r-1');
  });

  it('ramène vers Ma carte en conservant le restaurant courant', async () => {
    const back = (harness.routeNativeElement as HTMLElement).querySelector('a');
    expect(back?.textContent).toContain('Contenu de la carte');
    expect(back?.getAttribute('href')).toBe('/app/r-1/carte');

    await TestBed.inject(Router).navigateByUrl(back!.getAttribute('href')!);
    expect(TestBed.inject(Router).url).toBe('/app/r-1/carte');
  });
});
