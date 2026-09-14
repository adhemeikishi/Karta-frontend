import { MenuCategory } from '../menu.model';
import {
  editorKey,
  newCategory,
  newItem,
  reconcileWithSaved,
  toEditable,
  toSaveRequest,
  translationFor,
} from './menu-editor.model';

function category(overrides: Partial<MenuCategory> = {}): MenuCategory {
  return {
    id: 'cat-1',
    name: 'Entrées',
    description: null,
    sortOrder: 0,
    visible: true,
    items: [],
    ...overrides,
  };
}

describe('toEditable / toSaveRequest — round-trip', () => {
  it('préserve les id existants (mise à jour en place, pas de recréation)', () => {
    const source = [
      category({
        id: 'cat-1',
        items: [
          {
            id: 'item-1',
            name: 'Velouté',
            description: 'Crème fraîche',
            price: 890,
            currency: 'EUR',
            imageAssetId: null,
            imageUrl: null,
            sortOrder: 0,
            available: true,
          },
        ],
      }),
    ];

    const editable = toEditable(source);
    const request = toSaveRequest(editable);

    expect(request.categories[0].id).toBe('cat-1');
    expect(request.categories[0].items[0].id).toBe('item-1');
  });

  it("n'envoie pas d'id pour une catégorie ou un produit nouvellement créés", () => {
    const editable = [newCategory()];
    editable[0].name = 'Desserts';
    editable[0].items.push(newItem());
    editable[0].items[0].name = 'Tiramisu';
    editable[0].items[0].priceEuros = 6;

    const request = toSaveRequest(editable);

    expect(request.categories[0].id).toBeUndefined();
    expect(request.categories[0].items[0].id).toBeUndefined();
  });

  it('convertit le prix en euros vers des centimes entiers, sans erreur de flottant', () => {
    const source = [
      category({
        items: [
          {
            id: 'i1',
            name: 'Plat',
            description: null,
            price: 955,
            currency: 'EUR',
            imageAssetId: null,
            imageUrl: null,
            sortOrder: 0,
            available: true,
          },
        ],
      }),
    ];

    const editable = toEditable(source);
    expect(editable[0].items[0].priceEuros).toBe(9.55);

    const request = toSaveRequest(editable);
    expect(request.categories[0].items[0].price).toBe(955);
  });

  it("l'ordre local (position dans le tableau) devient le sortOrder envoyé", () => {
    const editable = toEditable([
      category({ id: 'a', name: 'A' }),
      category({ id: 'b', name: 'B' }),
    ]);
    // Réordonnancement local, comme le ferait un clic sur la flèche ↓.
    [editable[0], editable[1]] = [editable[1], editable[0]];

    const request = toSaveRequest(editable);

    expect(request.categories[0].name).toBe('B');
    expect(request.categories[0].sortOrder).toBe(0);
    expect(request.categories[1].name).toBe('A');
    expect(request.categories[1].sortOrder).toBe(1);
  });

  it('conserve description et visible existants même sans UI pour les modifier', () => {
    const source = [category({ id: 'cat-1', description: 'Pour commencer', visible: false })];
    const editable = toEditable(source);
    const request = toSaveRequest(editable);

    expect(request.categories[0].description).toBe('Pour commencer');
    expect(request.categories[0].visible).toBe(false);
  });
});

describe('traductions et langues (Premium)', () => {
  it("envoie les traductions renseignées, jamais les vides, et les langues activées", () => {
    const editable = toEditable([
      category({
        id: 'cat-1',
        translations: { en: { name: 'Starters', description: null } },
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
      }),
    ]);
    // Saisie comme le ferait l'éditeur en mode « EN » : le champ est créé à la demande.
    translationFor(editable[0].items[0], 'en').name = 'Soup';
    translationFor(editable[0].items[0], 'es').name = '   ';

    const request = toSaveRequest(editable, ['en', 'es']);

    expect(request.languages).toEqual(['en', 'es']);
    expect(request.categories[0].translations).toEqual({ en: { name: 'Starters', description: null } });
    expect(request.categories[0].items[0].translations).toEqual({ en: { name: 'Soup', description: null } });
  });

  it("n'envoie pas de langues quand l'éditeur ne les gère pas (Review KartaIA, offres non Premium)", () => {
    const request = toSaveRequest(toEditable([category()]));
    expect('languages' in request).toBeFalse();
    expect(request.categories[0].translations).toBeUndefined();
  });

  it("modifier une traduction ou une langue rend l'état « non enregistré »", () => {
    const editable = toEditable([category({ id: 'cat-1' })]);
    const before = editorKey(editable, ['en']);

    translationFor(editable[0], 'en').name = 'Starters';
    expect(editorKey(editable, ['en'])).not.toBe(before);
    expect(editorKey(toEditable([category({ id: 'cat-1' })]), ['en', 'zh'])).not.toBe(before);
  });
});

describe('reconcileWithSaved', () => {
  it('remplit les id créés par le serveur sans régénérer les uid locaux (focus stable)', () => {
    const local = [newCategory()];
    local[0].name = 'Plats';
    local[0].items.push(newItem());
    local[0].items[0].name = 'Burger';
    local[0].items[0].priceEuros = 12;
    const localCategoryUid = local[0].uid;
    const localItemUid = local[0].items[0].uid;

    const saved: MenuCategory[] = [
      category({
        id: 'server-cat-1',
        name: 'Plats',
        items: [
          {
            id: 'server-item-1',
            name: 'Burger',
            description: null,
            price: 1200,
            currency: 'EUR',
            imageAssetId: null,
            imageUrl: null,
            sortOrder: 0,
            available: true,
          },
        ],
      }),
    ];

    const reconciled = reconcileWithSaved(local, saved);

    expect(reconciled[0].id).toBe('server-cat-1');
    expect(reconciled[0].uid).toBe(localCategoryUid);
    expect(reconciled[0].items[0].id).toBe('server-item-1');
    expect(reconciled[0].items[0].uid).toBe(localItemUid);
  });

  it('un deuxième enregistrement après réconciliation met à jour en place (aucune duplication)', () => {
    let local = [newCategory()];
    local[0].name = 'Plats';
    local[0].items.push(newItem());
    local[0].items[0].name = 'Burger';
    local[0].items[0].priceEuros = 12;

    const saved: MenuCategory[] = [
      category({
        id: 'server-cat-1',
        name: 'Plats',
        items: [
          {
            id: 'server-item-1',
            name: 'Burger',
            description: null,
            price: 1200,
            currency: 'EUR',
            imageAssetId: null,
            imageUrl: null,
            sortOrder: 0,
            available: true,
          },
        ],
      }),
    ];
    local = reconcileWithSaved(local, saved);

    const secondRequest = toSaveRequest(local);

    expect(secondRequest.categories[0].id).toBe('server-cat-1');
    expect(secondRequest.categories[0].items[0].id).toBe('server-item-1');
  });
});
