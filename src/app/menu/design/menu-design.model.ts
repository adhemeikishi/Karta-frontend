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

/** Typographies PREMIUM — miroir de `MenuFont` côté backend, le catalogue arrive dans la réponse. */
export type MenuFontId =
  | 'PLUS_JAKARTA_SANS'
  | 'DM_SANS'
  | 'SPACE_GROTESK'
  | 'PLAYFAIR_DISPLAY'
  | 'LORA'
  | 'INSTRUMENT_SERIF';

export interface FontOption {
  id: MenuFontId;
  label: string;
}

export type QrModuleStyle = 'SQUARE' | 'ROUNDED' | 'DOTS';
export type QrEyeStyle = 'SQUARE' | 'ROUNDED' | 'CIRCLE';

/** Apparence du QR (offre PREMIUM). `null` = valeur par défaut (noir sur blanc, carré). */
export interface QrCustomization {
  fgColor: string | null;
  bgColor: string | null;
  moduleStyle: QrModuleStyle | null;
  eyeStyle: QrEyeStyle | null;
  logoAssetId: string | null;
  logoUrl: string | null;
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
  /* Personnalisation avancée — optionnelle côté TypeScript (fixtures, réponses antérieures). */
  hideBranding?: boolean;
  font?: MenuFontId | null;
  /** Codes ISO des langues activées en plus du français — lecture seule ici, écrites avec le contenu. */
  languages?: string[];
  qr?: QrCustomization;
}

/** Réponse de `GET/PUT .../menu/design`. Auto-suffisante : elle porte aussi les catalogues. */
export interface MenuDesign {
  offer: RestaurantOffer;
  /** Vrai pour PREMIUM uniquement. Conditionne l'édition, jamais l'accès à l'aperçu. */
  customizable: boolean;
  preset: MenuPresetId;
  presets: PresetOption[];
  fonts?: FontOption[];
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
  hideBranding?: boolean;
  font?: MenuFontId | null;
  qrFgColor?: string | null;
  qrBgColor?: string | null;
  qrModuleStyle?: QrModuleStyle | null;
  qrEyeStyle?: QrEyeStyle | null;
  qrLogoAssetId?: string | null;
}

/**
 * État d'édition du studio : ce que l'utilisateur est en train d'essayer, pas encore
 * enregistré. C'est cet objet qui alimente l'aperçu — d'où la mise à jour immédiate du
 * téléphone au moindre changement.
 *
 * Le QR (page « Mon QR code ») édite le même document : ses champs vivent ici aussi,
 * pour qu'un seul `PUT` porte toute l'identité du restaurant.
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
  hideBranding: boolean;
  font: MenuFontId | null;
  qrFgColor: string | null;
  qrBgColor: string | null;
  qrModuleStyle: QrModuleStyle | null;
  qrEyeStyle: QrEyeStyle | null;
  qrLogoAssetId: string | null;
  qrLogoUrl: string | null;
}

export function draftFrom(design: MenuDesign): DesignDraft {
  const c = design.customization;
  return {
    preset: design.preset,
    brandName: c.brandName,
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
    logoAssetId: c.logoAssetId,
    logoUrl: c.logoUrl,
    heroAssetId: c.heroAssetId,
    heroUrl: c.heroUrl,
    hideBranding: c.hideBranding ?? false,
    font: c.font ?? null,
    qrFgColor: c.qr?.fgColor ?? null,
    qrBgColor: c.qr?.bgColor ?? null,
    qrModuleStyle: c.qr?.moduleStyle ?? null,
    qrEyeStyle: c.qr?.eyeStyle ?? null,
    qrLogoAssetId: c.qr?.logoAssetId ?? null,
    qrLogoUrl: c.qr?.logoUrl ?? null,
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
    hideBranding: draft.hideBranding,
    font: draft.font,
    qrFgColor: draft.qrFgColor,
    qrBgColor: draft.qrBgColor,
    qrModuleStyle: draft.qrModuleStyle,
    qrEyeStyle: draft.qrEyeStyle,
    qrLogoAssetId: draft.qrLogoAssetId,
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
    draft.hideBranding ? '1' : '0',
    draft.font ?? '',
    qrDraftKey(draft),
  ].join('|');
}

/** Sous-clé du QR : l'aperçu du QR ne se relance que si le QR lui-même a changé. */
export function qrDraftKey(draft: DesignDraft): string {
  return [
    draft.qrFgColor ?? '',
    draft.qrBgColor ?? '',
    draft.qrModuleStyle ?? '',
    draft.qrEyeStyle ?? '',
    draft.qrLogoAssetId ?? '',
    draft.hideBranding ? '1' : '0',
  ].join('|');
}

/**
 * Même règle que `QrStyle.isScannable` côté serveur : modules nettement plus foncés que
 * le fond. Ici seulement pour prévenir avant d'enregistrer — le serveur reste juge.
 */
export function qrColorsScannable(fg: string, bg: string): boolean {
  const l = (hex: string) => {
    const c = (i: number) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
  };
  const f = l(fg);
  const b = l(bg);
  return f < b && (b + 0.05) / (f + 0.05) >= 4;
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
