import { FONT_SANS, FONT_SERIF } from '../landing/landing-menu-presets';
import { MenuFontId } from '../menu/design/menu-design.model';

export interface PremiumFontOption {
  id: MenuFontId;
  label: string;
  /** Pile CSS complète : la famille Premium, puis le repli système du même registre. */
  stack: string;
  /** Feuille Google Fonts à charger, `display=swap` — jamais de texte invisible. */
  stylesheetUrl: string;
}

function googleFontsUrl(query: string): string {
  return `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
}

/**
 * Catalogue PREMIUM des typographies pour la démo `/create/design` — miroir exact de
 * `MenuFont.java` (mêmes six familles, mêmes requêtes Google Fonts, même repli sans/serif
 * selon le registre). Rien n'est inventé : c'est le même catalogue fermé que le studio
 * réel, seule sa source change (statique ici, `GET .../menu/design` côté produit).
 */
export const PREMIUM_DEMO_FONTS: readonly PremiumFontOption[] = [
  {
    id: 'PLUS_JAKARTA_SANS',
    label: 'Plus Jakarta Sans',
    stack: `"Plus Jakarta Sans", ${FONT_SANS}`,
    stylesheetUrl: googleFontsUrl('Plus+Jakarta+Sans:wght@400;500;600;700'),
  },
  {
    id: 'DM_SANS',
    label: 'DM Sans',
    stack: `"DM Sans", ${FONT_SANS}`,
    stylesheetUrl: googleFontsUrl('DM+Sans:wght@400;500;600;700'),
  },
  {
    id: 'SPACE_GROTESK',
    label: 'Space Grotesk',
    stack: `"Space Grotesk", ${FONT_SANS}`,
    stylesheetUrl: googleFontsUrl('Space+Grotesk:wght@400;500;600;700'),
  },
  {
    id: 'PLAYFAIR_DISPLAY',
    label: 'Playfair Display',
    stack: `"Playfair Display", ${FONT_SERIF}`,
    stylesheetUrl: googleFontsUrl('Playfair+Display:wght@400;500;600;700'),
  },
  {
    id: 'LORA',
    label: 'Lora',
    stack: `"Lora", ${FONT_SERIF}`,
    stylesheetUrl: googleFontsUrl('Lora:wght@400;500;600;700'),
  },
  {
    id: 'INSTRUMENT_SERIF',
    label: 'Instrument Serif',
    stack: `"Instrument Serif", ${FONT_SERIF}`,
    stylesheetUrl: googleFontsUrl('Instrument+Serif'),
  },
];

export function findPremiumFont(id: MenuFontId | null): PremiumFontOption | null {
  if (!id) {
    return null;
  }
  return PREMIUM_DEMO_FONTS.find((font) => font.id === id) ?? null;
}

/**
 * Charge la feuille Google Fonts d'une police Premium si elle ne l'est pas déjà —
 * jamais deux fois la même requête, jamais au chargement de la page (voir `MenuFont`
 * côté backend : sans choix, aucune police distante n'est téléchargée).
 */
export function ensureFontLoaded(font: PremiumFontOption): void {
  if (typeof document === 'undefined') {
    return;
  }
  const linkId = `premium-font-${font.id}`;
  if (document.getElementById(linkId)) {
    return;
  }
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.stylesheetUrl;
  document.head.appendChild(link);
}
