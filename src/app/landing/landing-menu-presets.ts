/**
 * Miroir fidèle du rendu public Karta pour la landing (#premium).
 *
 * Le vrai menu public est rendu par `MenuRenderer` (Thymeleaf, `templates/menu/menu.html`)
 * — impossible à exécuter dans un navigateur. Ce fichier + `menu-render.component`
 * reproduisent **à l'identique** :
 *   - les 5 presets réels et leurs couleurs → `MenuPreset.java` ;
 *   - la résolution du thème (couleurs dérivées, texte lisible, densité, police)
 *     → `MenuThemeResolver.resolve()` + `HexColor` ;
 *   - le balisage et le CSS → `menu/menu.html` (repris tel quel dans le composant).
 *
 * Limite assumée (comme avant) : si `MenuPreset.java`, `MenuThemeResolver` ou
 * `menu/menu.html` changent côté backend, il faut répercuter ici. C'est le prix de
 * l'absence de dépendance de la landing statique (Cloudflare) au backend (VPS).
 */
export type LandingMenuPresetId = 'modern' | 'dark' | 'street_food' | 'minimal' | 'luxe';
export type MenuDensity = 'editorial' | 'compact' | 'airy' | 'elegant';

/* Piles typographiques — copiées telles quelles de `MenuPreset.Typeface` (backend). */
const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", sans-serif';
const FONT_SERIF =
  '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';

/** Un des 5 presets Karta. `background`/`accent`/`text` copiés de `MenuPreset.java`. */
export interface LandingMenuPreset {
  id: LandingMenuPresetId;
  label: string;
  background: string;
  accent: string;
  text: string;
  density: MenuDensity;
  typeface: 'sans' | 'serif';
}

export const LANDING_MENU_PRESETS: readonly LandingMenuPreset[] = [
  { id: 'modern', label: 'Modern', background: '#FFFFFF', accent: '#F05A00', text: '#131312', density: 'editorial', typeface: 'sans' },
  { id: 'dark', label: 'Dark', background: '#131312', accent: '#012FA4', text: '#FFFFFF', density: 'editorial', typeface: 'sans' },
  { id: 'street_food', label: 'Street Food', background: '#131312', accent: '#DC2626', text: '#FFFFFF', density: 'compact', typeface: 'sans' },
  { id: 'minimal', label: 'Minimal', background: '#FFFFFF', accent: '#131312', text: '#131312', density: 'airy', typeface: 'sans' },
  { id: 'luxe', label: 'Luxe', background: '#131312', accent: '#C9A96E', text: '#F5EDD8', density: 'elegant', typeface: 'serif' },
];

/* ---------------------------------------------------------------------------
 * HexColor (port TS strict) — mêmes formules que `com.qrmenu.render.HexColor`.
 * ------------------------------------------------------------------------- */

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX.test(value);
}

function toRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Mélange linéaire `from` → `to` (ratio 0..1). Identique à `HexColor.mix`. */
export function mix(from: string, to: string, ratio: number): string {
  const a = toRgb(from);
  const b = toRgb(to);
  const t = Math.min(1, Math.max(0, ratio));
  return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

/** Luminance relative perçue (WCAG). Identique à `HexColor.luminance`. */
export function luminance(hex: string): number {
  const chan = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** `#131312` sur fond clair, `#FFFFFF` sur fond sombre. Identique à `HexColor.readableOn`. */
export function readableOn(background: string): string {
  return luminance(background) > 0.5 ? '#131312' : '#FFFFFF';
}

/* ---------------------------------------------------------------------------
 * MenuThemeResolver (port TS strict) — `MenuThemeResolver.resolve()`.
 * Le résultat porte les noms des variables CSS `--t-*` de `menu/menu.html`.
 * ------------------------------------------------------------------------- */

/** Équivalent 1:1 de `com.qrmenu.render.MenuTheme`. */
export interface ResolvedMenuTheme {
  preset: LandingMenuPresetId;
  presetLabel: string;
  density: MenuDensity;
  fontStack: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  dark: boolean;
  logoUrl: string | null;
  heroUrl: string | null;
}

/**
 * Thème effectif d'un preset + personnalisation PREMIUM.
 * `primary` = couleur principale (accent), `secondary` = couleur secondaire (fond).
 *
 * Règles identiques à `MenuThemeResolver.resolve()` :
 *  - fond   = secondaire choisie, sinon fond du preset ;
 *  - accent = principale choisie, sinon accent du preset ;
 *  - texte  = celui du preset TANT que le fond n'est pas remplacé ; dès qu'une
 *             couleur secondaire est posée, on redérive un texte lisible dessus ;
 *  - surface/border/muted/accentText = mêmes `mix()` / `readableOn()` que le renderer.
 */
export function resolveLandingTheme(
  base: LandingMenuPreset,
  primary: string | null,
  secondary: string | null,
  logoUrl: string | null = null,
  heroUrl: string | null = null,
): ResolvedMenuTheme {
  const background = isHex(secondary) ? secondary.toUpperCase() : base.background;
  const accent = isHex(primary) ? primary.toUpperCase() : base.accent;
  const text = isHex(secondary) ? readableOn(background) : base.text;

  return {
    preset: base.id,
    presetLabel: base.label,
    density: base.density,
    fontStack: base.typeface === 'serif' ? FONT_SERIF : FONT_SANS,
    background,
    surface: mix(background, text, 0.05),
    border: mix(background, text, 0.16),
    text,
    muted: mix(text, background, 0.42),
    accent,
    accentText: readableOn(accent),
    dark: luminance(background) <= 0.5,
    logoUrl,
    heroUrl,
  };
}

/* ---------------------------------------------------------------------------
 * Contenu de démonstration — forme identique à `PublicMenuDtos.PublicMenu`.
 * Un seul contenu, rendu par les 5 presets : le style ne connaît jamais le contenu.
 * ------------------------------------------------------------------------- */

export interface LandingMenuItem {
  name: string;
  description?: string;
  /** Déjà formaté « 12,50 € », comme `PublicItem.priceLabel`. */
  priceLabel: string;
  imageUrl?: string;
  available: boolean;
}

export interface LandingMenuCategory {
  name: string;
  description?: string;
  items: readonly LandingMenuItem[];
}

export interface LandingMenuContent {
  restaurantName: string;
  categories: readonly LandingMenuCategory[];
}

export const LANDING_MENU_CONTENT: LandingMenuContent = {
  restaurantName: 'Le Petit Persil',
  categories: [
    {
      name: 'Entrées',
      items: [
        { name: 'Burrata crémeuse', description: 'Tomates confites, basilic', priceLabel: '9,50 €', available: true },
        { name: 'Carpaccio de bœuf', priceLabel: '11,00 €', available: true },
        { name: 'Velouté de saison', priceLabel: '8,00 €', available: true },
      ],
    },
    {
      name: 'Plats',
      items: [
        { name: 'Classic Smash Burger', description: 'Cheddar, pickles, sauce maison', priceLabel: '12,50 €', available: true },
        { name: 'Pasta Truffe', priceLabel: '16,50 €', available: true },
        { name: 'Poulet Teriyaki', priceLabel: '14,00 €', available: true },
        { name: 'Saumon grillé', description: 'Légumes de saison', priceLabel: '21,00 €', available: true },
      ],
    },
    {
      name: 'Desserts',
      items: [
        { name: 'Tiramisu', priceLabel: '7,00 €', available: true },
        { name: 'Cheesecake', priceLabel: '7,50 €', available: true },
      ],
    },
  ],
};
