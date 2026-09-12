import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ShellService } from '../../layout/shell.service';
import { MenuDraft } from './menu-draft.model';
import { MenuReviewComponent } from './menu-review.component';

const DRAFT: MenuDraft = {
  sourceAssetId: 'a-1',
  sourceFilename: 'carte.pdf',
  extractedAt: '2026-02-01T10:00:00Z',
  categoryCount: 1,
  itemCount: 1,
  needsReviewCount: 0,
  missingPriceCount: 0,
  categories: [
    {
      name: 'Entrées',
      items: [
        {
          name: 'Velouté',
          description: null,
          price: 890,
          currency: 'EUR',
          needsReview: false,
          note: null,
        },
      ],
    },
  ],
};

/**
 * Un seul écran de Review pour les deux espaces (voir MenuReviewComponent). Ces tests
 * verrouillent la seule chose qui les distingue — la sortie de l'écran — dans les deux
 * sens : le restaurateur ne doit jamais atterrir dans `/admin`, et le back-office doit
 * garder exactement le comportement qu'il avait.
 */
function setup(params: Record<string, string>, data: Record<string, unknown>) {
  TestBed.configureTestingModule({
    imports: [MenuReviewComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(params), data } },
      },
    ],
  });
}

describe('MenuReviewComponent — ouverte depuis l’Espace Restaurateur', () => {
  let fixture: ComponentFixture<MenuReviewComponent>;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    setup({ restaurantId: 'r-1' }, { space: 'restaurateur' });
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(MenuReviewComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function flushLoad(): void {
    http.expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-1`).flush({
      id: 'r-1',
      name: 'Chez Karta',
      offer: 'PRO',
      onboardingCompletedAt: '2026-01-01T10:00:00Z',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    });
    http
      .expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-1/menu/ai/draft`)
      .flush(DRAFT);
    fixture.detectChanges();
  }

  it('lit `restaurantId` et renvoie vers Ma carte, jamais vers /admin', () => {
    flushLoad();
    expect(fixture.componentInstance.restaurantId).toBe('r-1');
    expect(fixture.componentInstance.detailLink()).toEqual(['/app', 'r-1', 'carte']);
    expect(fixture.componentInstance.backLabel).toBe('Retour à ma carte');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('client');
  });

  it('ne pose pas le fil d’Ariane du back-office', () => {
    flushLoad();
    expect(TestBed.inject(ShellService).breadcrumbs()).toEqual([]);
  });

  it('valide par le PUT existant puis revient sur Ma carte — sans publier', () => {
    flushLoad();
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-1/menu`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.categories[0].items[0].price).toBe(890); // centimes entiers
    req.flush({ type: 'STRUCTURED', status: 'READY', version: 2 });

    expect(navigate).toHaveBeenCalledWith(['/app', 'r-1', 'carte']);
    http.expectNone(`${environment.apiBaseUrl}/api/admin/restaurants/r-1/menu/publish`);
  });
});

describe('MenuReviewComponent — non-régression back-office', () => {
  let fixture: ComponentFixture<MenuReviewComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    setup({ id: 'r-9' }, {});
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MenuReviewComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('garde le paramètre `id`, le lien vers la fiche client et le fil d’Ariane', () => {
    http
      .expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-9`)
      .flush('', { status: 500, statusText: 'Server Error' });
    http
      .expectOne(`${environment.apiBaseUrl}/api/admin/restaurants/r-9/menu/ai/draft`)
      .flush(DRAFT);

    expect(fixture.componentInstance.restaurantId).toBe('r-9');
    expect(fixture.componentInstance.detailLink()).toEqual(['/admin/restaurants', 'r-9']);
    expect(fixture.componentInstance.backLabel).toBe('Retour au client');
    expect(TestBed.inject(ShellService).breadcrumbs()).toEqual([
      { label: 'Clients', link: '/admin/restaurants' },
      { label: 'Vérification du menu' },
    ]);
  });
});
