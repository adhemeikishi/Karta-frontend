import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CreationDraftService } from '../../create/creation-draft.service';
import { MenuImportDropzoneComponent } from './menu-import-dropzone.component';

const EXTRACT_URL = `${environment.apiBaseUrl}/api/public/menu-demo/extract`;

function pdfFile(name = 'ma-carte.pdf', sizeBytes = 1000): File {
  const file = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function dropFile(fixture: ComponentFixture<MenuImportDropzoneComponent>, file: File): void {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function clickCreate(fixture: ComponentFixture<MenuImportDropzoneComponent>): void {
  const button: HTMLButtonElement = fixture.nativeElement.querySelector('.imp-drop-body button.btn-primary');
  button.click();
  fixture.detectChanges();
}

/**
 * Le dépôt PDF de la landing (chapitre « 01 · Votre menu ») : c'est ici, et nulle part
 * ailleurs, que le PDF part réellement vers KartaAI. On verrouille le contrat critique —
 * ne jamais naviguer vers `/karta-ai` avant une extraction confirmée par le backend, et
 * ne jamais y naviguer du tout si elle échoue — ainsi que le refus côté client (format,
 * taille) qui n'a pas besoin d'appeler le serveur.
 */
describe('MenuImportDropzoneComponent (landing)', () => {
  let fixture: ComponentFixture<MenuImportDropzoneComponent>;
  let http: HttpTestingController;
  let drafts: CreationDraftService;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [MenuImportDropzoneComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    drafts = TestBed.inject(CreationDraftService);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(MenuImportDropzoneComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('extrait réellement le PDF puis navigue vers /karta-ai seulement après succès', () => {
    dropFile(fixture, pdfFile('carte-du-chef.pdf'));
    clickCreate(fixture);

    // Pas de navigation prématurée : la requête est en cours.
    expect(navigate).not.toHaveBeenCalled();

    const req = http.expectOne(EXTRACT_URL);
    expect(req.request.method).toBe('POST');
    req.flush({
      categories: [
        {
          name: 'Burgers',
          items: [
            {
              name: 'Cheeseburger',
              description: 'Steak haché, cheddar, salade',
              price: 1290,
              currency: 'EUR',
              needsReview: false,
              note: null,
            },
          ],
        },
      ],
    });

    expect(navigate).toHaveBeenCalledWith(['/karta-ai']);
    expect(drafts.draft()?.sourceKind).toBe('uploaded');
    expect(drafts.draft()?.fileName).toBe('carte-du-chef.pdf');
    expect(drafts.draft()?.stage).toBe('analyzing');
    expect(drafts.draft()?.categories[0].items[0].name).toBe('Cheeseburger');
  });

  it('refuse un fichier non PDF sans appeler le serveur ni créer de brouillon', () => {
    const notPdf = new File(['x'], 'carte.png', { type: 'image/png' });
    dropFile(fixture, notPdf);

    http.expectNone(EXTRACT_URL);
    expect(drafts.exists()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Format accepté : PDF.');
  });

  it('refuse un PDF trop volumineux sans appeler le serveur', () => {
    dropFile(fixture, pdfFile('trop-gros.pdf', 11 * 1024 * 1024));

    http.expectNone(EXTRACT_URL);
    expect(drafts.exists()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('dépasse la taille maximale');
  });

  it('reste sur la landing et affiche une erreur propre si KartaAI échoue', () => {
    dropFile(fixture, pdfFile());
    clickCreate(fixture);

    http.expectOne(EXTRACT_URL).flush(
      { message: 'Aucun plat n’a pu être lu dans ce PDF.' },
      { status: 502, statusText: 'Bad Gateway' },
    );
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(drafts.exists()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Aucun plat n’a pu être lu');
    // Le fichier reste sélectionné : on peut réessayer sans tout recommencer.
    expect(fixture.nativeElement.textContent).toContain('ma-carte.pdf');
  });

  it('affiche le message de quota dépassé sans naviguer', () => {
    dropFile(fixture, pdfFile());
    clickCreate(fixture);

    http.expectOne(EXTRACT_URL).flush(
      { message: "Trop d'essais depuis cette connexion." },
      { status: 429, statusText: 'Too Many Requests' },
    );
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Trop d'essais");
  });

  it('empêche une double soumission pendant que l’extraction est en cours', () => {
    dropFile(fixture, pdfFile());
    clickCreate(fixture);
    clickCreate(fixture); // second clic pendant l'appel en cours

    http.expectOne(EXTRACT_URL); // une seule requête envoyée
  });
});
