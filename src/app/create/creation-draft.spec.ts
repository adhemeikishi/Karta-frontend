import { TestBed } from '@angular/core/testing';
import { CreationDraftService } from './creation-draft.service';
import { countDraft, keptCategories, newCreationDraft, toPreviewMenu } from './creation-draft.model';

/**
 * Le brouillon est ce que le visiteur a construit avant d'avoir un compte : c'est la
 * seule chose du parcours qu'on n'a pas le droit de perdre. On vérifie donc qu'il
 * survit à un rechargement, que décocher un plat se répercute partout, et que les
 * chiffres annoncés sont bien comptés sur le contenu et non écrits en dur.
 */
describe('Brouillon de création', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('part d’un fichier et d’une carte à relire', () => {
    const draft = newCreationDraft('menu-restaurant.pdf', 2_400_000);
    expect(draft.stage).toBe('analyzing');
    expect(draft.categories.length).toBeGreaterThan(0);
    // Une lecture de PDF laisse des trous : sans eux, la vérification n'aurait pas d'objet.
    expect(countDraft(draft).needsReview).toBeGreaterThan(0);
  });

  it('compte ce que la carte contient réellement', () => {
    const draft = newCreationDraft('carte.pdf', 1000);
    const counts = countDraft(draft);
    const items = draft.categories.flatMap((category) => category.items);
    expect(counts.categories).toBe(draft.categories.length);
    expect(counts.items).toBe(items.length);
    expect(counts.prices).toBe(items.filter((item) => item.priceEuros !== null).length);
    expect(counts.descriptions).toBe(
      items.filter((item) => item.description.trim() !== '').length,
    );
  });

  it('retire un plat décoché de l’aperçu et des compteurs', () => {
    const service = TestBed.inject(CreationDraftService);
    service.start('carte.pdf', 1000);
    const before = service.counts()!.items;
    const uid = service.draft()!.categories[0].items[0].uid;

    service.toggleItem(uid);
    expect(service.counts()!.items).toBe(before - 1);

    const names = toPreviewMenu(service.draft()!).categories.flatMap((c) => c.items.map((i) => i.name));
    expect(names).not.toContain(service.draft()!.categories[0].items[0].name);

    service.toggleItem(uid); // décocher se défait
    expect(service.counts()!.items).toBe(before);
  });

  it('ne laisse jamais une catégorie vide dans l’aperçu', () => {
    const draft = newCreationDraft('carte.pdf', 1000);
    const first = draft.categories[0];
    const emptied = { ...draft, excluded: first.items.map((item) => item.uid) };
    expect(keptCategories(emptied).some((category) => category.uid === first.uid)).toBeFalse();
  });

  it('n’invente pas de prix pour un plat qui n’en a pas', () => {
    const draft = newCreationDraft('carte.pdf', 1000);
    const preview = toPreviewMenu(draft);
    const missing = preview.categories
      .flatMap((category) => category.items)
      .filter((item) => item.priceLabel === '');
    expect(missing.length).toBe(countDraft(draft).items - countDraft(draft).prices);
    expect(missing.every((item) => !item.priceLabel.includes('0,00'))).toBeTrue();
  });

  it('survit à un rechargement de la page', () => {
    const service = TestBed.inject(CreationDraftService);
    service.start('carte.pdf', 1000);
    service.setPreset('luxe');
    service.setBrandName('Chez Miloud');
    service.setStage('design');

    // Un nouveau service = ce que fait un rechargement d'onglet.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(CreationDraftService);
    expect(reloaded.draft()?.presetId).toBe('luxe');
    expect(reloaded.draft()?.brandName).toBe('Chez Miloud');
    expect(reloaded.stage()).toBe('design');
  });

  it('oublie tout quand le visiteur quitte le parcours', () => {
    const service = TestBed.inject(CreationDraftService);
    service.start('carte.pdf', 1000);
    service.clear();
    expect(service.exists()).toBeFalse();
    expect(sessionStorage.getItem('karta_creation_draft')).toBeNull();
  });
});
