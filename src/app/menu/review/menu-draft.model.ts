/**
 * Brouillon KartaAI : ce que l'IA a compris du PDF, avant toute écriture dans le menu.
 *
 * Les métadonnées d'extraction (`needsReview`, `note`) servent uniquement à guider la
 * relecture. Elles disparaissent à la validation : le menu enregistré ne contient que
 * des catégories, des plats et des prix.
 */
export interface DraftItem {
  name: string;
  description: string | null;
  /** Centimes entiers (950 = 9,50 €), ou null si le PDF ne permettait pas de le lire. */
  price: number | null;
  currency: string;
  /** L'extraction a un doute sur ce plat : à vérifier avant de valider. */
  needsReview: boolean;
  /** Raison du doute, très courte. */
  note: string | null;
}

export interface DraftCategory {
  name: string;
  items: DraftItem[];
}

export interface MenuDraft {
  sourceAssetId: string | null;
  sourceFilename: string | null;
  extractedAt: string;
  categoryCount: number;
  itemCount: number;
  needsReviewCount: number;
  missingPriceCount: number;
  categories: DraftCategory[];
}

// -------------------------------------------------------------- état d'édition

/**
 * Ligne éditable de l'écran de Review.
 *
 * Le prix est saisi en **euros** (c'est ce que le restaurateur lit sur sa carte) et
 * reconverti en centimes entiers au moment de valider : la conversion se fait à un seul
 * endroit, et aucun flottant n'atteint jamais le backend.
 *
 * `uid` est purement local : il donne à `@for` une identité stable pour que réordonner
 * ou supprimer une ligne ne recrée pas les champs de saisie voisins.
 */
export interface EditableItem {
  uid: string;
  name: string;
  description: string;
  priceEuros: number | null;
  currency: string;
  needsReview: boolean;
  note: string | null;
}

export interface EditableCategory {
  uid: string;
  name: string;
  items: EditableItem[];
}

let uidCounter = 0;

function nextUid(): string {
  uidCounter += 1;
  return `k${uidCounter}`;
}

export function toEditable(draft: MenuDraft): EditableCategory[] {
  return draft.categories.map((category) => ({
    uid: nextUid(),
    name: category.name,
    items: category.items.map((item) => ({
      uid: nextUid(),
      name: item.name,
      description: item.description ?? '',
      priceEuros: item.price === null ? null : item.price / 100,
      currency: item.currency || 'EUR',
      needsReview: item.needsReview,
      note: item.note,
    })),
  }));
}

export function newItem(): EditableItem {
  return {
    uid: nextUid(),
    name: '',
    description: '',
    priceEuros: null,
    currency: 'EUR',
    needsReview: false,
    note: null,
  };
}

export function newCategory(): EditableCategory {
  return { uid: nextUid(), name: '', items: [newItem()] };
}

// -------------------------------------------------------------- affichage du prix

/**
 * Formate un prix en euros pour l'affichage du champ de saisie : toujours deux
 * décimales, virgule française (« 8,90 », « 12,00 »).
 *
 * `null` (prix introuvable dans le PDF) devient une chaîne vide plutôt que « 0,00 » —
 * afficher un zéro laisserait croire qu'un prix a été lu alors qu'il ne l'a pas été.
 *
 * Appelé uniquement à l'initialisation du champ et à sa perte de focus (`blur`),
 * jamais pendant la frappe : reformater à chaque caractère déplacerait le curseur et
 * empêcherait de taper une virgule.
 */
export function formatPriceInput(euros: number | null): string {
  if (euros === null || Number.isNaN(euros)) {
    return '';
  }
  return euros.toFixed(2).replace('.', ',');
}

/**
 * Reconvertit la saisie utilisateur en nombre d'euros, ou `null` si le champ est vide
 * ou illisible. Accepte la virgule et le point comme séparateur décimal.
 *
 * Ne fait aucun arrondi aux centimes ici : {@link toSaveRequest} reste le seul endroit
 * qui convertit vers des centimes entiers, pour n'avoir qu'un seul point de conversion
 * vers le format que le backend attend.
 */
export function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/**
 * Convertit vers le contrat d'écriture du menu (`PUT .../menu`).
 *
 * `Math.round` est indispensable : 9.55 * 100 vaut 954.9999... en virgule flottante.
 * Sans arrondi, un prix sur deux serait faux d'un centime.
 */
export function toSaveRequest(categories: EditableCategory[]) {
  return {
    categories: categories.map((category, index) => ({
      name: category.name.trim(),
      sortOrder: index,
      visible: true,
      items: category.items.map((item, itemIndex) => ({
        name: item.name.trim(),
        description: item.description.trim() === '' ? null : item.description.trim(),
        price: Math.round((item.priceEuros ?? 0) * 100),
        currency: item.currency || 'EUR',
        sortOrder: itemIndex,
        available: true,
      })),
    })),
  };
}
