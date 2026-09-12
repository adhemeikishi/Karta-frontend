import {
  EditableCategory,
  EditableItem,
  MenuDraft,
  toEditable,
} from '../menu/review/menu-draft.model';
import {
  LANDING_MENU_CONTENT,
  LandingMenuContent,
  LandingMenuPresetId,
} from '../landing/landing-menu-presets';

/**
 * Où en est le visiteur dans le parcours de création.
 *
 * L'étape est portée par le brouillon, pas par l'URL : revenir en arrière, recharger la
 * page ou passer par la connexion ne doit jamais faire perdre le travail déjà fait.
 */
export type CreationStage =
  | 'import'
  | 'analyzing'
  | 'review'
  | 'design'
  | 'auth'
  | 'pricing'
  | 'completed';

/**
 * Le travail en cours d'un visiteur qui n'a pas encore de compte.
 *
 * Les catégories réutilisent le modèle d'édition de la Review réelle
 * ({@link EditableCategory}) : le jour où l'extraction sera branchée, ce brouillon
 * pourra alimenter le même écran sans conversion.
 */
export interface CreationDraft {
  /** Nom et taille du fichier déposé : les seules données réelles du parcours. */
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
  stage: CreationStage;

  categories: EditableCategory[];
  /** `uid` des plats décochés à la vérification. Retirer n'efface pas : on peut revenir. */
  excluded: string[];

  presetId: LandingMenuPresetId;
  brandName: string;
  /** Couleur d'accent (PREMIUM), `null` = celle du preset. */
  primaryColor: string | null;
  /** Couleur de fond (PREMIUM), `null` = celle du preset. */
  secondaryColor: string | null;
}

/** « 12,50 € » vers des centimes entiers, comme le reste du produit. */
function centsFromLabel(label: string): number | null {
  const value = Number(label.replace(/[^\d,.]/g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

/**
 * La carte d'exemple, présentée sous la forme que produirait une extraction.
 *
 * <strong>Rien n'est extrait du fichier déposé.</strong> Ce parcours est une
 * démonstration : le fichier ne quitte pas l'appareil et n'est pas lu. Le contenu vient
 * de {@link LANDING_MENU_CONTENT}, source unique du menu d'exemple, et tous les
 * compteurs affichés dans le parcours sont comptés dessus.
 *
 * Deux plats sont marqués « à vérifier » avec un prix manquant : la vérification n'a de
 * sens que s'il y a quelque chose à corriger, et c'est exactement ce que produit une
 * lecture de PDF imparfaite.
 */
function demoMenuAsDraft(fileName: string): MenuDraft {
  const categories = LANDING_MENU_CONTENT.categories.map((category) => ({
    name: category.name,
    items: category.items.map((item) => ({
      name: item.name,
      description: item.description ?? null,
      price: centsFromLabel(item.priceLabel),
      currency: 'EUR',
      needsReview: false,
      note: null as string | null,
    })),
  }));

  // Deux hésitations plausibles : un prix illisible, une ligne collée à la suivante.
  const uncertain = [
    { category: 1, item: 4, note: 'Prix non lisible sur le document' },
    { category: 5, item: 4, note: 'Prix non lisible sur le document' },
  ];
  for (const { category, item, note } of uncertain) {
    const target = categories[category]?.items[item];
    if (target) {
      target.price = null;
      target.needsReview = true;
      target.note = note;
    }
  }

  const items = categories.flatMap((category) => category.items);
  return {
    sourceAssetId: null,
    sourceFilename: fileName,
    extractedAt: new Date().toISOString(),
    categoryCount: categories.length,
    itemCount: items.length,
    needsReviewCount: items.filter((item) => item.needsReview).length,
    missingPriceCount: items.filter((item) => item.price === null).length,
    categories,
  };
}

/** Brouillon initial, au moment où le fichier est déposé sur la landing. */
export function newCreationDraft(fileName: string, fileSizeBytes: number): CreationDraft {
  return {
    fileName,
    fileSizeBytes,
    createdAt: new Date().toISOString(),
    stage: 'analyzing',
    categories: toEditable(demoMenuAsDraft(fileName)),
    excluded: [],
    presetId: 'modern',
    brandName: LANDING_MENU_CONTENT.restaurantName,
    primaryColor: null,
    secondaryColor: null,
  };
}

/* ------------------------------------------------------------------ lectures */

export interface DraftCounts {
  categories: number;
  items: number;
  prices: number;
  descriptions: number;
  needsReview: number;
}

/** Tout est compté sur le contenu réellement présent — aucun chiffre écrit en dur. */
export function countDraft(draft: CreationDraft): DraftCounts {
  const kept = keptCategories(draft);
  const items = kept.flatMap((category) => category.items);
  return {
    categories: kept.length,
    items: items.length,
    prices: items.filter((item) => item.priceEuros !== null).length,
    descriptions: items.filter((item) => item.description.trim() !== '').length,
    needsReview: items.filter((item) => item.needsReview).length,
  };
}

/** Catégories privées de leurs plats décochés (et des catégories devenues vides). */
export function keptCategories(draft: CreationDraft): EditableCategory[] {
  const excluded = new Set(draft.excluded);
  return draft.categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => !excluded.has(item.uid)),
    }))
    .filter((category) => category.items.length > 0);
}

export function isIncluded(draft: CreationDraft, item: EditableItem): boolean {
  return !draft.excluded.includes(item.uid);
}

/**
 * Le brouillon tel que l'aperçu doit le montrer.
 *
 * Même forme que `PublicMenuDtos.PublicMenu` : c'est le vrai composant de rendu
 * (`menu-render`) qui l'affiche, pas une maquette. Un plat sans prix n'est pas inventé à
 * zéro — son prix reste vide, exactement comme il apparaîtrait en ligne.
 */
export function toPreviewMenu(draft: CreationDraft): LandingMenuContent {
  return {
    restaurantName: draft.brandName.trim() || LANDING_MENU_CONTENT.restaurantName,
    categories: keptCategories(draft).map((category) => ({
      name: category.name,
      items: category.items.map((item) => ({
        name: item.name,
        description: item.description.trim() === '' ? undefined : item.description,
        priceLabel: item.priceEuros === null ? '' : `${item.priceEuros.toFixed(2).replace('.', ',')} €`,
        available: true,
      })),
    })),
  };
}
