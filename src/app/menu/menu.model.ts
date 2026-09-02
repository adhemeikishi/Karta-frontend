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

/** Formate un prix en centimes vers la devise du produit. */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}
