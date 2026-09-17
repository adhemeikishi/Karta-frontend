/** Types miroir de `com.qrmenu.kartapay.ModifierDtos` (backend) — groupes d'options d'un plat. */

/** `SINGLE` implique `maxSelect = 1` côté backend. */
export type SelectionType = 'SINGLE' | 'MULTIPLE';

export interface ModifierOption {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  selectionType: SelectionType;
  minSelect: number;
  maxSelect: number | null;
  sortOrder: number;
  options: ModifierOption[];
}

export interface SaveModifierOptionRequest {
  id?: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
  sortOrder?: number;
}

export interface SaveModifierGroupRequest {
  id?: string;
  name: string;
  selectionType: SelectionType;
  minSelect: number;
  maxSelect: number | null;
  sortOrder?: number;
  options: SaveModifierOptionRequest[];
}

export interface SaveModifierGroupsRequest {
  groups: SaveModifierGroupRequest[];
}

// -------------------------------------------------------------- état d'édition

/**
 * État local d'un groupe/option en édition dans `menu-editor` — même principe que
 * `EditableItem`/`EditableCategory` de l'éditeur de carte : `uid` local pour `@for`,
 * `id` `null` tant que non enregistré côté serveur.
 */
export interface EditableModifierOption {
  uid: string;
  id: string | null;
  name: string;
  /** Toujours >= 0 : un retrait d'ingrédient est une option à 0€, jamais un prix négatif. */
  priceEuros: number;
  available: boolean;
}

export interface EditableModifierGroup {
  uid: string;
  id: string | null;
  name: string;
  selectionType: SelectionType;
  minSelect: number;
  maxSelect: number | null;
  options: EditableModifierOption[];
}

let uidCounter = 0;

function nextUid(): string {
  uidCounter += 1;
  return `mg${uidCounter}`;
}

export function toEditableGroups(groups: ModifierGroup[]): EditableModifierGroup[] {
  return groups.map((group) => ({
    uid: nextUid(),
    id: group.id,
    name: group.name,
    selectionType: group.selectionType,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.options.map((option) => ({
      uid: nextUid(),
      id: option.id,
      name: option.name,
      priceEuros: option.priceDeltaCents / 100,
      available: option.available,
    })),
  }));
}

export function newModifierGroup(): EditableModifierGroup {
  return { uid: nextUid(), id: null, name: '', selectionType: 'SINGLE', minSelect: 0, maxSelect: 1, options: [] };
}

export function newModifierOption(): EditableModifierOption {
  return { uid: nextUid(), id: null, name: '', priceEuros: 0, available: true };
}

/** Reflète côté UI la contrainte backend `SINGLE` => `maxSelect = 1`, pour éviter un aller-retour serveur. */
export function applySelectionType(group: EditableModifierGroup, type: SelectionType): void {
  group.selectionType = type;
  if (type === 'SINGLE') {
    group.maxSelect = 1;
    group.minSelect = Math.min(group.minSelect, 1);
  }
}

/**
 * Vers le contrat d'écriture (`PUT .../modifier-groups`). Document complet par produit :
 * ce qui n'est pas envoyé est supprimé côté serveur, comme `PUT .../menu`.
 */
export function toSaveModifierGroupsRequest(groups: EditableModifierGroup[]): SaveModifierGroupsRequest {
  return {
    groups: groups.map((group, gi) => ({
      ...(group.id ? { id: group.id } : {}),
      name: group.name.trim(),
      selectionType: group.selectionType,
      // Un champ nombre vidé par l'utilisateur peut transiter par `null` (NumberValueAccessor
      // d'Angular) malgré le typage TS : on retombe sur 0 plutôt que d'envoyer une valeur illisible.
      minSelect: group.minSelect ?? 0,
      maxSelect: group.selectionType === 'SINGLE' ? 1 : (group.maxSelect ?? null),
      sortOrder: gi,
      options: group.options.map((option, oi) => ({
        ...(option.id ? { id: option.id } : {}),
        name: option.name.trim(),
        // Jamais négatif : un retrait d'ingrédient est une option à 0€ (voir price_delta_cents backend).
        priceDeltaCents: Math.max(0, Math.round((option.priceEuros ?? 0) * 100)),
        available: option.available,
        sortOrder: oi,
      })),
    })),
  };
}
