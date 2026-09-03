import { scrollToAnchor } from './scroll-to-anchor';

/**
 * Régression : un `<a href="#id">` brut est intercepté par le Router Angular
 * (`PathLocationStrategy` réagit aussi à `hashchange`) et redirige vers
 * `admin/dashboard` au lieu de défiler la page (voir scroll-to-anchor.ts). Ces tests
 * couvrent le cas nominal et les cas où le clic doit être laissé au navigateur.
 */
describe('scrollToAnchor', () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('section');
    target.id = 'test-section';
    target.scrollIntoView = jasmine.createSpy('scrollIntoView');
    document.body.appendChild(target);
  });

  afterEach(() => {
    target.remove();
  });

  function click(overrides: Partial<MouseEvent> = {}): MouseEvent {
    return {
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      defaultPrevented: false,
      preventDefault: jasmine.createSpy('preventDefault'),
      ...overrides,
    } as unknown as MouseEvent;
  }

  it('empêche la navigation native et défile vers la cible', () => {
    const event = click();
    scrollToAnchor('test-section', event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it("ne fait rien si l'élément n'existe pas — laisse le lien tel quel", () => {
    const event = click();
    scrollToAnchor('inconnu', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('laisse le navigateur gérer un clic milieu/molette (ouverture nouvel onglet)', () => {
    const event = click({ button: 1 });
    scrollToAnchor('test-section', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  });

  for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
    it(`laisse le navigateur gérer un clic avec ${key} (ouverture nouvel onglet/fenêtre)`, () => {
      const event = click({ [key]: true });
      scrollToAnchor('test-section', event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(target.scrollIntoView).not.toHaveBeenCalled();
    });
  }

  it('respecte prefers-reduced-motion (défilement instantané, pas smooth)', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const event = click();
    scrollToAnchor('test-section', event);
    expect(target.scrollIntoView).toHaveBeenCalledWith(
      jasmine.objectContaining({ behavior: 'auto' }),
    );
  });
});
