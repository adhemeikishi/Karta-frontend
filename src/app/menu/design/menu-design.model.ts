import { RestaurantOffer } from '../../models/restaurant.model';

/**
 * Styles disponibles. Miroir de `MenuPreset` côté backend — mais les **couleurs** ne
 * sont jamais recopiées ici : elles arrivent dans `DesignResponse.presets`, ce qui
 * garantit qu'une pastille du sélecteur ne peut pas mentir sur le rendu réel.
 */
export type MenuPresetId = 'MODERN' | 'DARK' | 'STREET_FOOD' | 'MINIMAL' | 'LUXE';

export interface PresetOption {
  id: MenuPresetId;
  label: string;
  background: string;
  accent: string;
  text: string;
}

/** Identité du restaurant (offre PREMIUM). Tout est optionnel : rien = le preset décide. */
export interface MenuCustomization {
  brandName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoAssetId: string | null;
  logoUrl: string | null;
  heroAssetId: string | null;
  heroUrl: string | null;
}

/** Réponse de `GET/PUT .../menu/design`. Auto-suffisante : elle porte aussi le catalogue. */
export interface MenuDesign {
  offer: RestaurantOffer;
  /** Vrai pour PREMIUM uniquement. Conditionne l'édition, jamais l'accès à l'aperçu. */
  customizable: boolean;
  preset: MenuPresetId;
  presets: PresetOption[];
  customization: MenuCustomization;
}

/** Corps de `PUT .../menu/design`. Document complet : un champ absent efface la valeur. */
export interface SaveDesignRequest {
  preset: MenuPresetId;
  brandName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoAssetId?: string | null;
  heroAssetId?: string | null;
}

/**
 * État d'édition du studio : ce que l'utilisateur est en train d'essayer, pas encore
 * enregistré. C'est cet objet qui alimente l'aperçu — d'où la mise à jour immédiate du
 * téléphone au moindre changement.
 */
export interface DesignDraft {
  preset: MenuPresetId;
  brandName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoAssetId: string | null;
  logoUrl: string | null;
  heroAssetId: string | null;
  heroUrl: string | null;
}

export function draftFrom(design: MenuDesign): DesignDraft {
  return {
    preset: design.preset,
    brandName: design.customization.brandName,
    primaryColor: design.customization.primaryColor,
    secondaryColor: design.customization.secondaryColor,
    logoAssetId: design.customization.logoAssetId,
    logoUrl: design.customization.logoUrl,
    heroAssetId: design.customization.heroAssetId,
    heroUrl: design.customization.heroUrl,
  };
}

export function toSaveRequest(draft: DesignDraft): SaveDesignRequest {
  return {
    preset: draft.preset,
    brandName: draft.brandName,
    primaryColor: draft.primaryColor,
    secondaryColor: draft.secondaryColor,
    logoAssetId: draft.logoAssetId,
    heroAssetId: draft.heroAssetId,
  };
}

/**
 * Clé de comparaison d'un brouillon.
 *
 * Sert à deux choses : détecter « modifications non enregistrées », et éviter de
 * relancer l'aperçu quand rien n'a réellement changé (un clic sur le preset déjà
 * sélectionné ne doit produire aucune requête).
 */
export function draftKey(draft: DesignDraft): string {
  return [
    draft.preset,
    draft.brandName ?? '',
    draft.primaryColor ?? '',
    draft.secondaryColor ?? '',
    draft.logoAssetId ?? '',
    draft.heroAssetId ?? '',
  ].join('|');
}

/** Réponse de `POST .../images`. */
export interface UploadedImage {
  assetId: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string | null;
}

/** 5 Mo — doit rester aligné avec MediaService.MAX_IMAGE_BYTES côté backend. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
