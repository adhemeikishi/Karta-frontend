/**
 * Les 5 presets réels du menu public, mirroir de
 * `backend/src/main/java/com/qrmenu/menu/MenuPreset.java` (couleurs, densité,
 * typographie — valeurs copiées telles quelles). Angular ne peut pas importer
 * l'enum Java : ce fichier doit être maintenu à jour manuellement si
 * `MenuPreset.java` change — c'est une limite assumée, pas une source de vérité
 * dupliquée en cachette (voir DESIGN.md §12 : contenu ≠ présentation).
 *
 * Utilisé uniquement par la landing, pour démontrer les 5 styles dans le même
 * mockup téléphone — jamais par le rendu public réel (`MenuRenderer`), qui reste
 * la seule source de vérité visuelle d'un vrai menu (DESIGN.md §12).
 */
export type LandingMenuPresetId = 'modern' | 'dark' | 'street_food' | 'minimal' | 'luxe';

export interface LandingMenuPreset {
  id: LandingMenuPresetId;
  label: string;
  background: string;
  accent: string;
  text: string;
  /** Séparateur lisible sur `background` — pas dans `MenuPreset.java` (dérivé ici, le
   *  vrai rendu le calcule côté CSS), volontairement explicite pour éviter tout calcul
   *  de contraste approximatif. */
  divider: string;
  density: 'editorial' | 'compact' | 'airy' | 'elegant';
  typeface: 'sans' | 'serif';
}

export const LANDING_MENU_PRESETS: readonly LandingMenuPreset[] = [
  {
    id: 'modern',
    label: 'Modern',
    background: '#FFFFFF',
    accent: '#F05A00',
    text: '#131312',
    divider: 'rgba(19, 19, 18, 0.1)',
    density: 'editorial',
    typeface: 'sans',
  },
  {
    id: 'dark',
    label: 'Dark',
    background: '#131312',
    accent: '#012FA4',
    text: '#FFFFFF',
    divider: 'rgba(255, 255, 255, 0.14)',
    density: 'editorial',
    typeface: 'sans',
  },
  {
    id: 'street_food',
    label: 'Street Food',
    background: '#131312',
    accent: '#DC2626',
    text: '#FFFFFF',
    divider: 'rgba(255, 255, 255, 0.14)',
    density: 'compact',
    typeface: 'sans',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    background: '#FFFFFF',
    accent: '#131312',
    text: '#131312',
    divider: 'rgba(19, 19, 18, 0.1)',
    density: 'airy',
    typeface: 'sans',
  },
  {
    id: 'luxe',
    label: 'Luxe',
    background: '#131312',
    accent: '#C9A96E',
    text: '#F5EDD8',
    divider: 'rgba(245, 237, 216, 0.18)',
    density: 'elegant',
    typeface: 'serif',
  },
];

export interface LandingMenuItem {
  name: string;
  price: string;
  description?: string;
}

export interface LandingMenuCategory {
  name: string;
  items: readonly LandingMenuItem[];
}

/**
 * Un seul contenu, rendu par les 5 presets — c'est exactement le principe réel de
 * Karta (§12) : le contenu ne connaît jamais le style. Montrer un contenu qui
 * change avec le preset laisserait croire à 5 menus différents.
 *
 * Volume choisi pour remplir réellement l'écran du téléphone (aucun grand vide en
 * bas) sur les 5 presets, y compris le plus haut par ligne (`elegant`/Luxe, nom +
 * prix empilés) — vérifié à 1024/390px, la plus petite taille de téléphone. Ni trop
 * (pas de scroll interne), ni trop peu (pas de vide artificiel) : un extrait crédible
 * de carte, pas une carte complète.
 */
export const LANDING_MENU_CONTENT: {
  restaurant: string;
  tagline: string;
  categories: readonly LandingMenuCategory[];
} = {
  restaurant: 'Le Petit Persil',
  tagline: 'Cuisine de saison',
  categories: [
    {
      name: 'Entrées',
      items: [
        { name: 'Burrata crémeuse', price: '9,50€', description: 'Tomates confites, basilic' },
        { name: 'Carpaccio de bœuf', price: '11€' },
        { name: 'Velouté de saison', price: '8€' },
      ],
    },
    {
      name: 'Plats',
      items: [
        { name: 'Classic Smash Burger', price: '12,50€', description: 'Cheddar, pickles, sauce maison' },
        { name: 'Pasta Truffe', price: '16,50€' },
        { name: 'Poulet Teriyaki', price: '14€' },
        { name: 'Saumon grillé', price: '21€', description: 'Légumes de saison' },
      ],
    },
    {
      name: 'Desserts',
      items: [
        { name: 'Tiramisu', price: '7€' },
        { name: 'Cheesecake', price: '7,50€' },
      ],
    },
  ],
};
