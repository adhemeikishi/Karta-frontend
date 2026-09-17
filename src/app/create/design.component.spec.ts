import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CreationDraftService } from './creation-draft.service';
import { DesignComponent } from './design.component';

function pngFile(name = 'logo.png', sizeBytes = 1000): File {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

/**
 * `/create/design` — la démonstration Premium. Elle ne dépend d'aucun backend et ne
 * doit plus, depuis la correction du dépôt PDF sur la landing, appeler
 * `MenuDemoService` ni exposer de dropzone : ce sont ces deux garanties que ce test
 * verrouille, en plus de vérifier que chaque contrôle Premium (identité, médias,
 * typographie, branding) modifie immédiatement l'aperçu (`theme()`).
 */
describe('DesignComponent', () => {
  let fixture: ComponentFixture<DesignComponent>;
  let component: DesignComponent;
  let drafts: CreationDraftService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [DesignComponent],
      providers: [provideRouter([])],
    });
    drafts = TestBed.inject(CreationDraftService);
    drafts.start('demo.pdf', 1000);
    fixture = TestBed.createComponent(DesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('n’expose plus aucun dépôt PDF sur cet écran', () => {
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).not.toContain('create-menu-demo-import');
    expect(fixture.nativeElement.textContent).not.toContain('Et avec votre carte ?');
    expect(fixture.nativeElement.querySelector('input[type="file"][accept*="pdf"]')).toBeNull();
  });

  it('répercute le nom affiché dans l’aperçu', () => {
    component.setBrandName('Chez Miloud');
    fixture.detectChanges();
    expect(drafts.draft()?.brandName).toBe('Chez Miloud');
    expect(component.menu()?.restaurantName).toBe('Chez Miloud');
  });

  it('répercute la couleur principale dans le thème résolu', () => {
    component.setColor('primary', '#012fa4');
    fixture.detectChanges();
    expect(component.theme().accent).toBe('#012FA4');
  });

  it('répercute la couleur secondaire dans le thème résolu', () => {
    component.setColor('secondary', '#101010');
    fixture.detectChanges();
    expect(component.theme().background).toBe('#101010');
  });

  it('affiche immédiatement un logo sélectionné localement, sans appel réseau', () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [pngFile()] });
    component.onImageSelected({ target: input } as unknown as Event, 'logo');
    fixture.detectChanges();

    expect(component.logoUrl()).toMatch(/^blob:/);
    expect(component.theme().logoUrl).toBe(component.logoUrl());
  });

  it('affiche immédiatement une image d’en-tête sélectionnée localement', () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [pngFile('hero.jpg')] });
    component.onImageSelected({ target: input } as unknown as Event, 'hero');
    fixture.detectChanges();

    expect(component.heroUrl()).toMatch(/^blob:/);
    expect(component.theme().heroUrl).toBe(component.heroUrl());
  });

  it('refuse un fichier média qui n’est pas une image acceptée', () => {
    const input = document.createElement('input');
    const pdf = new File(['x'], 'menu.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [pdf] });
    component.onImageSelected({ target: input } as unknown as Event, 'logo');
    fixture.detectChanges();

    expect(component.logoUrl()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Formats acceptés');
  });

  it('refuse une image dépassant 5 Mo', () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [pngFile('trop-grand.png', 6 * 1024 * 1024)] });
    component.onImageSelected({ target: input } as unknown as Event, 'logo');
    fixture.detectChanges();

    expect(component.logoUrl()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('5 Mo');
  });

  it('change réellement la typographie appliquée au rendu', () => {
    const withoutChoice = component.theme().fontStack;
    component.setFont('LORA');
    fixture.detectChanges();

    expect(component.theme().fontStack).toContain('Lora');
    expect(component.theme().fontStack).not.toBe(withoutChoice);
  });

  it('revient à la typographie du style quand aucune police n’est choisie', () => {
    component.setFont('LORA');
    fixture.detectChanges();
    component.setFont('');
    fixture.detectChanges();

    expect(component.theme().fontStack).not.toContain('Lora');
  });

  it('retire réellement la mention Karta du pied de la carte quand demandé', () => {
    expect(fixture.nativeElement.textContent).toContain('Karta');
    const footerBefore = fixture.nativeElement.querySelector('menu-render footer');
    expect(footerBefore).not.toBeNull();

    component.setHideBranding(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('menu-render footer')).toBeNull();
  });

  it('fait réapparaître la mention Karta quand l’option est désactivée', () => {
    component.setHideBranding(true);
    fixture.detectChanges();
    component.setHideBranding(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('menu-render footer')).not.toBeNull();
  });
});
