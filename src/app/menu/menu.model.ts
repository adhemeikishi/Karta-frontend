import { RestaurantOffer } from '../models/restaurant.model';

/** Correspond à MenuType côté backend. BASIC → PDF, PRO/PREMIUM → STRUCTURED. */
export type MenuType = 'PDF' | 'STRUCTURED';

/** Cycle de vie du menu. Le champ `published` du JSON en est dérivé. */
export type MenuStatus = 'DRAFT' | 'READY' | 'PUBLISHED';

export interface MenuPdf {
  assetId: string;
  url: string;
  originalFilename: string | null;
  sizeBytes: number;
  uploadedAt: string;
}

/**
 * Produit d'une catégorie.
 * `price` est toujours en **centimes entiers** (1290 = 12,90 €) — jamais de flottant.
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageAssetId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  visible: boolean;
  items: MenuItem[];
}

/** JSON canonique du menu structuré : contrat partagé avec le futur renderer. */
export interface MenuStructure {
  restaurantName: string;
  currency: string;
  categories: MenuCategory[];
}

export interface Menu {
  offer: RestaurantOffer;
  type: MenuType;
  status: MenuStatus;
  version: number;
  published: boolean;
  publishedAt: string | null;
  /** Renseigné uniquement pour un menu PDF. */
  pdf: MenuPdf | null;
  /** Renseigné uniquement pour un menu STRUCTURED. */
  structure: MenuStructure | null;
}

// -------------------------------------------------------------------- écriture

/** Corps de `PUT .../menu` : document complet, ce qui n'est pas envoyé est supprimé. */
export interface SaveMenuRequest {
  categories: SaveCategoryRequest[];
}

export interface SaveCategoryRequest {
  /** Omis pour une création, fourni pour conserver l'identité d'une catégorie existante. */
  id?: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  visible?: boolean;
  items: SaveItemRequest[];
}

export interface SaveItemRequest {
  id?: string;
  name: string;
  description?: string | null;
  /** Centimes entiers. */
  price: number;
  currency?: string;
  imageAssetId?: string | null;
  sortOrder?: number;
  available?: boolean;
}

/** 10 Mo — doit rester aligné avec MediaService.MAX_PDF_BYTES côté backend. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Un contenu structuré a réellement été enregistré au moins une fois pour ce menu
 * (édition manuelle ou validation KartaIA) — qu'il soit aujourd'hui vide ou non.
 *
 * Le seuil est `version > 1`, PAS `version > 0` : une ligne `menus` peut exister sans
 * qu'aucun contenu n'ait jamais été écrit — le studio de style (`PUT .../menu/design`)
 * crée la ligne dès le premier choix de preset, à `version = 1`, sans jamais
 * l'incrémenter (`Menu.bumpVersion()` n'a qu'un seul appelant côté backend,
 * `MenuService.saveStructure()`). Le tout premier enregistrement de contenu réel — via
 * l'éditeur ou via la Review KartaIA validée, les deux passant par le même
 * `PUT .../menu` — crée la ligne à `version = 1` PUIS l'incrémente dans le même appel,
 * donc `version = 2` dès ce premier enregistrement. `version = 1` seul ne prouve donc
 * qu'une chose : quelqu'un a choisi un style, jamais qu'un menu a été créé.
 *
 * Volontairement PAS déduit du nombre de catégories/plats : un menu structuré peut
 * exister et être vide après une édition qui a tout supprimé — il doit alors continuer
 * à afficher l'éditeur, pas repasser par l'état initial.
 *
 * Règle partagée par le back-office et l'Espace Restaurateur : un seul endroit, sinon
 * les deux écrans finiraient par diverger sur « ce client a-t-il une carte ? ».
 */
export function hasStructuredContent(menu: Menu | null): boolean {
  return menu !== null && menu.type === 'STRUCTURED' && menu.version > 1;
}

/** Formate un prix en centimes vers la devise du produit. */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}
