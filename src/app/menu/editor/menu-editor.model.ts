import { MenuCategory, MenuItem, SaveCategoryRequest, SaveItemRequest } from '../menu.model';
import { formatPriceInput, parsePriceInput } from '../review/menu-draft.model';

// Les deux fonctions de conversion prix euros <-> centimes sont réutilisées telles
// quelles depuis la Review (voir menu-draft.model.spec.ts pour leurs cas limites) :
// même règle, même endroit, un seul point de vérité pour cet aller-retour.
export { formatPriceInput, parsePriceInput };

/**
 * État d'édition local d'un produit.
 *
 * À la différence du brouillon KartaAI ({@link EditableItem} de `review/`), un plat ici
 * peut déjà exister en base : `id` est donc préservé quand il est présent, pour que
 * l'enregistrement mette à jour en place plutôt que de recréer (voir
 * `docs/MENU_STRUCTURED.md` §3 — l'identité d'un produit n'est pas cosmétique, une
 * future photo ou un futur commentaire plat par plat s'y rattachera).
 *
 * `uid` est purement local (identité stable pour `@for`, y compris pour un plat pas
 * encore enregistré qui n'a donc pas encore de vrai `id`).
 */
export interface EditableItem {
  uid: string;
  /** `null` = pas encore enregistré ; sera rempli par la réponse du premier `PUT`. */
  id: string | null;
  name: string;
  description: string;
  /** `null` = aucun prix saisi. Jamais 0 par défaut : un prix vide n'est pas gratuit. */
  priceEuros: number | null;
  currency: string;
  imageAssetId: string | null;
  imageUrl: string | null;
  available: boolean;
}

export interface EditableCategory {
  uid: string;
  id: string | null;
  name: string;
  /** Non exposée dans cette UI (voir §3 du besoin) : conservée telle quelle au save. */
  description: string | null;
  /** Idem : pas de bascule dans cet éditeur, la valeur existante n'est pas perdue. */
  visible: boolean;
  items: EditableItem[];
}

let uidCounter = 0;

function nextUid(): string {
  uidCounter += 1;
  return `e${uidCounter}`;
}

export function toEditableItem(item: MenuItem): EditableItem {
  return {
    uid: nextUid(),
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    priceEuros: item.price / 100,
    currency: item.currency || 'EUR',
    imageAssetId: item.imageAssetId,
    imageUrl: item.imageUrl,
    available: item.available,
  };
}

export function toEditableCategory(category: MenuCategory): EditableCategory {
  return {
    uid: nextUid(),
    id: category.id,
    name: category.name,
    description: category.description,
    visible: category.visible,
    items: category.items.map(toEditableItem),
  };
}

export function toEditable(categories: MenuCategory[]): EditableCategory[] {
  return categories.map(toEditableCategory);
}

export function newItem(): EditableItem {
  return {
    uid: nextUid(),
    id: null,
    name: '',
    description: '',
    priceEuros: null,
    currency: 'EUR',
    imageAssetId: null,
    imageUrl: null,
    available: true,
  };
}

export function newCategory(): EditableCategory {
  return { uid: nextUid(), id: null, name: '', description: null, visible: true, items: [] };
}

/**
 * Vers le contrat d'écriture (`PUT .../menu`). `id` n'est envoyé que s'il existe déjà :
 * c'est ce qui fait la différence entre « mettre à jour en place » et « créer ».
 * `sortOrder` découle de la position dans le tableau — l'ordre local EST l'ordre à
 * enregistrer, pas besoin de le stocker séparément.
 */
export function toSaveRequest(categories: EditableCategory[]): { categories: SaveCategoryRequest[] } {
  return {
    categories: categories.map((category, ci) => ({
      ...(category.id ? { id: category.id } : {}),
      name: category.name.trim(),
      description: category.description,
      sortOrder: ci,
      visible: category.visible,
      items: category.items.map((item, ii): SaveItemRequest => ({
        ...(item.id ? { id: item.id } : {}),
        name: item.name.trim(),
        description: item.description.trim() === '' ? null : item.description.trim(),
        // Validé en amont par canSave() : jamais appelé avec un prix manquant.
        // Math.round : 9.55 * 100 vaut 954.9999... en flottant, sans arrondi un prix
        // sur deux serait faux d'un centime.
        price: Math.round((item.priceEuros ?? 0) * 100),
        currency: item.currency || 'EUR',
        imageAssetId: item.imageAssetId,
        sortOrder: ii,
        available: item.available,
      })),
    })),
  };
}

/**
 * Signature stable de l'état édité, pour détecter s'il diverge du dernier état enregistré
 * (même principe que `draftKey` pour le studio de style) — sans comparaison profonde
 * d'objets à chaque frappe.
 */
export function editorKey(categories: EditableCategory[]): string {
  return JSON.stringify(toSaveRequest(categories));
}

/**
 * Reconstitue l'état local à partir de la réponse d'enregistrement, en conservant les
 * `uid` locaux (donc la position à l'écran et le focus) plutôt que de tout régénérer.
 *
 * Sert à récupérer les identifiants attribués par le serveur aux catégories/produits
 * nouvellement créés : sans ce ré-alignement, un deuxième « Enregistrer » les prendrait
 * pour de nouvelles entrées et les dupliquerait en base.
 *
 * Alignement par position (même ordre des deux côtés, celui envoyé) — sûr car les
 * contrôles de réorganisation sont désactivés pendant l'enregistrement.
 */
export function reconcileWithSaved(
  local: EditableCategory[],
  saved: MenuCategory[],
): EditableCategory[] {
  return local.map((category, ci) => {
    const savedCategory = saved[ci];
    if (!savedCategory) {
      return category;
    }
    return {
      ...category,
      id: savedCategory.id,
      items: category.items.map((item, ii) => {
        const savedItem = savedCategory.items[ii];
        return savedItem ? { ...item, id: savedItem.id } : item;
      }),
    };
  });
}
