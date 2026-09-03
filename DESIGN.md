# Karta — DESIGN.md

Source de vérité design pour le back-office Karta (`admin-frontend/`) et le menu public
rendu (`backend/.../render`). Document **descriptif** : il documente ce qui existe déjà
dans le repository, pas une aspiration. Quand une information n'est pas déterminable
depuis le code, c'est écrit `À définir` plutôt qu'inventé.

Fichiers sources de vérité réels :

| Ce qui est documenté ici | Fichier réel |
|---|---|
| Tokens (couleurs, radius, shadows, fonts) | `admin-frontend/src/styles.css` (`:root`), `admin-frontend/tailwind.config.js` |
| Composants back-office | `admin-frontend/src/app/**` |
| Presets du menu public | `backend/src/main/java/com/qrmenu/menu/MenuPreset.java` |
| Rendu du menu public | `backend/src/main/resources/templates/menu/menu.html`, `com.qrmenu.render.*` |
| Règles produit / périmètre | `CLAUDE.md`, `docs/MENU_STRUCTURED.md`, `docs/DEPLOYMENT.md` |
| Exceptions Impeccable déjà actées | `.impeccable/config.json` |

`docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/CURRENT_STATE.md`
n'existent pas dans ce repository — non référencés plus loin.

**PrimeNG n'est pas utilisé.** Aucune dépendance UI tierce (`admin-frontend/package.json`
ne référence que `@angular/*`, `rxjs`, `tailwindcss`). Karta a un système de composants
**maison**, en classes CSS (`@layer components` dans `styles.css`) + utilitaires
Tailwind. Toute consigne mentionnant PrimeNG ailleurs est erronée pour ce projet.

---

## 1. Identité de marque

| | |
|---|---|
| Nom | Karta (= carte / menu — le motif cartographique du §5 en découle) |
| Positionnement | *« Restaurant-tech »* (eyebrow, page de connexion) |
| Signature | *« Moins de files. Plus de commandes. »* (page de connexion) |
| Contexte | Outil back-office interne, utilisé par des restaurateurs et leur équipe — pas un produit grand public |

### Typographie de marque — verrouillée

| Rôle | Police | Où |
|---|---|---|
| Interface (UI, corps, titres) | **Plus Jakarta Sans** | `--k-font-sans`, `tailwind.config.js: fontFamily.sans` |
| Données, IDs, technique | **Geist Mono** | `--k-font-mono`, `tailwind.config.js: fontFamily.mono` |

Ce sont des **règles de marque**, pas un choix esthétique à remettre en question. Un
détecteur signalant ces polices comme « overused » doit être ignoré — exception déjà
actée dans `.impeccable/config.json` (voir §16). Ne jamais les remplacer.

**Quand utiliser Geist Mono** (`class="mono"`, ou classes dérivées `k-coord`, `eyebrow`,
`badge`, en-têtes de `data-table`) : montants, dates, compteurs, ID, codes QR, labels
techniques en capitales. Jamais pour du texte éditorial (noms de plats, descriptions,
messages).

### Motifs visuels de marque

Deux motifs cartographiques, intentionnels, faisant partie de l'identité — **ne pas les
supprimer au prétexte qu'un détecteur les qualifie de bruit visuel** :

| Classe | Effet | Usage réel actuel |
|---|---|---|
| `.k-crosshair` | Grille 16×16px, lignes `--k-ink-200` | Fond du cadre QR (`restaurant-detail`), overlay 6 % d'opacité sur le panneau d'identité de la page de connexion |
| `.k-ticks` | Règle graduée, dégradé en fondu | Sous le titre du Dashboard, accent sur la page de connexion |

Exception déjà déclarée dans `.impeccable/config.json` (`codex-grid-background`, fichier
`admin-frontend/src/styles.css`) : *« `.k-crosshair` est le motif d'enregistrement Karta
(= carte), utilisé derrière l'image QR (une surface de mesure/calibrage) et faiblement
sur le panneau de connexion. »*

---

## 2. Couleurs

Source unique : `--k-*` dans `styles.css:root`, reflété dans `tailwind.config.js` (deux
copies synchronisées — **modifier les deux si un token change**).

### Cœur d'identité

| Token | Hex | Rôle |
|---|---|---|
| `--k-charcoal` (`ink-900`) | `#131312` | Texte principal, fond sidebar/topbar, `btn-secondary` |
| `--k-charcoal-soft` | `#1E1D1B` | Hover sur surfaces charcoal |
| `--k-charcoal-line` | `#2A2926` | Séparateurs sur fond charcoal |
| `--k-charcoal-muted` | `#9A9A93` | Texte discret sur fond charcoal |
| `--k-eclipse` | `#0C0C0C` | Fond des overlays/backdrop, teinte des ombres les plus profondes |
| `--k-persimmon` | `#F05A00` | **Couleur primaire / accent unique.** CTA, liens actifs, focus ring, statut « en attente » |
| `--k-persimmon-hover` | `#D44F00` | Hover sur persimmon |
| `--k-persimmon-soft` | `#FCEDE3` | Fond teinté (ex. tuile KPI « aujourd'hui ») |

### Neutres (une seule famille de gris chauds)

| Token | Hex | Usage typique |
|---|---|---|
| `ink-900` | `#131312` | Texte fort, titres |
| `ink-700` | `#3B3A37` | Corps de texte par défaut (`body`) |
| `ink-600` | `#57564F` | Texte secondaire appuyé |
| `ink-500` | `#6B6A64` | Texte secondaire, labels de KPI, placeholders |
| `ink-400` | `#8C8B84` | Texte tertiaire, icônes discrètes |
| `ink-300` | `#B6B5AE` | Bordures visibles, séparateurs actifs |
| `ink-200` | `#DBDAD5` | Bordures d'input/bouton |
| `ink-100` | `#EEEEE9` | Fonds discrets (skeleton, hover ghost) |
| `--k-hairline` | `#E6E6E4` | Bordure par défaut des cards/tables (quasi = `ink-200`, réservé aux séparateurs de structure) |
| `--k-ivory` | `#F6F6F6` | Surface secondaire (en-têtes de table, media-slot) |
| `--k-canvas` | `#FAFAF8` | Fond de page |
| `--k-white` | `#FFFFFF` | Surfaces (cards, inputs, modals) |

### Sémantique

| Token | Hex | Rôle |
|---|---|---|
| `--k-success` | `#2E7D57` | Statut actif/publié |
| `--k-success-soft` | `#E7F2EC` | Fond badge succès |
| `--k-danger` | `#C0403B` | Erreurs, actions destructrices |
| `--k-danger-soft` / `--k-danger-line` | `#FBECEB` / `#EDC9C7` | Fond / bordure alerte erreur |
| `--k-warning` | `#A66207` | Statut brouillon |
| `--k-warning-soft` | `#F8EFE0` | Fond badge brouillon |

Les textes d'alerte utilisent des teintes légèrement plus sombres pour le contraste
(`#8F2F2B` sur `alert-error`, `#7A4A08` sur `alert-warning`) — ne pas les confondre avec
les tokens de base ci-dessus, ce sont des variantes « texte sur fond teinté ».

### Accents secondaires — usage ponctuel uniquement

`--k-slate` (`#4A6D7C`) et `--k-teal` (`#6B8E8E`) : présents dans les tokens mais **sans
usage identifié actuellement dans les composants**. À traiter comme réservés, pas comme
un jeu de couleurs à mobiliser librement.

### Règle

**`--k-persimmon` est la seule couleur d'accent.** Toute nouvelle couleur d'accent
(violet, bleu, vert vif, etc.) est hors charte — vérifier d'abord si `persimmon`,
`success`, `warning` ou `danger` couvre déjà le besoin avant d'en proposer une nouvelle.

### Exception scopée — matière des badges d'offre

`.badge-basic`/`.badge-pro`/`.badge-premium` (`styles.css`) portent chacun un dégradé
métallique **en teintes hex directes, non tokenisées** — bronze/cuivre, argent/chrome,
or, `linear-gradient(160deg, …)` + `box-shadow` interne discret (liseré + reflet léger
en haut). Ce n'est **pas** une nouvelle couleur d'accent au sens de la règle ci-dessus :
c'est une décision produit scopée à ces trois classes uniquement, pour évoquer une
matière (le rang de l'offre), jamais une gamification (pas d'emoji, pas de pictogramme
médaille/trophée). Les libellés restent `BASIC`/`PRO`/`PREMIUM` — voir §11. Ne pas
étendre ce traitement à d'autres badges (statut, disponibilité) ni le retokeniser sans
qu'un vrai besoin de réutilisation apparaisse ailleurs (§17).

---

## 3. Typographie

| Rôle | Classe | Taille / poids | Usage |
|---|---|---|---|
| H1 page | `.page-title` | `1.35rem→1.5rem` (sm+) bold, tracking `-0.01em` | Un par page |
| Sous-titre de page | `.page-subtitle` | `text-sm` `ink-500` | Sous le H1 |
| H2 section | `.section-title` | `0.95rem` semibold, tracking `-0.005em` | En-tête de card/section |
| Titre de modale | `.modal-title` | `text-base` bold | — |
| Corps | *(défaut body)* | `text-sm` (`0.875rem`) `ink-700` | Texte courant |
| Label de champ | `.field-label` | `text-sm` medium `ink-700` | Au-dessus d'un input |
| Aide de champ | `.field-hint` | `text-xs` `ink-500` | Sous un input |
| Eyebrow | `.eyebrow` | `0.6875rem` mono, uppercase, tracking `.14em` | Sur-titre discret |
| Coordonnée technique | `.k-coord` | `0.6875rem` mono, tracking `.04em`, `ink-400` | Dates, compteurs annexes |
| Donnée / KPI | `.kpi-value`, `.mono` | mono, `tabular-nums` | Tout chiffre significatif |
| Badge | `.badge` | `0.6875rem` mono, uppercase, tracking `.06em` | Statuts, offres |

**Règle** : tout ce qui est un **nombre**, un **ID**, une **date**, un **prix** ou un
**code** passe en `.mono` (Geist Mono). Tout le reste reste en Plus Jakarta Sans.
`font-variant-numeric: tabular-nums` est systématique sur les chiffres alignés en colonne
(`.tnum`, `.mono`).

---

## 4. Spacing

Pas de token `xs/sm/md/lg` custom : Karta utilise **directement l'échelle Tailwind**
(`p-1`…`p-8`, en rem). Le rythme réellement observé :

| Contexte | Valeur |
|---|---|
| Padding interne de card | `p-4` (16px) → `sm:p-5` (20px) |
| En-tête de card (`card-head`) | `px-4 py-3` → `sm:px-5` |
| Padding de modale | `p-5` → `sm:p-6` (24px) |
| Ligne de table | `px-4 py-2.5`/`py-3` |
| Gap entre boutons/badges | `gap-2` à `gap-3` |
| Gap entre sections de page | `gap-4` à `gap-6` (`mt-4`, `mt-6`) |
| Espace généreux (marketing/login) | `p-10`, `py-10` — réservé aux écrans d'entrée, pas aux écrans de gestion |

**Règle** : rester dans `3/4/5/6` (12/16/20/24px) pour toute interface de gestion. Les
valeurs `8/10/12` (32/40/48px) sont réservées aux pages d'accueil/connexion — les
utiliser dans un tableau de gestion serait le signe d'un espacement décoratif non
fonctionnel (voir §8, densité).

---

## 5. Border radius

| Token | Valeur | Appliqué à |
|---|---|---|
| `--k-r-xs` | 4px | Swatch de couleur (`color-input`) |
| `--k-r-sm` (`rounded-sm`) | 6px | Boutons `btn-sm`, badges, icônes, preset-swatch |
| `--k-r-md` (`rounded-md`, défaut) | 8px | Boutons, inputs, cards internes, modales (mobile) |
| `--k-r-lg` (`rounded-lg`) | 12px | Cards, modales (desktop) |
| `rounded-full` | 9999px | Points de statut (`badge-dot`), pastilles, jauges |
| `rounded-[2.5rem]`/`[2.125rem]` | 40px/34px | **Décoratif uniquement** : chrome du `phone-frame` (imite un vrai téléphone), hors système |

**Hiérarchie** : plus un élément est « conteneur » (card > input/bouton > badge), plus le
radius est grand. Aucun élément de gestion courant ne dépasse `12px` — le phone-frame est
la seule exception, assumée (§17).

---

## 6. Shadows & bordures

Ombres **toutes teintées charcoal**, jamais grises neutres, et volontairement discrètes :

| Token | Valeur | Usage |
|---|---|---|
| `--k-shadow-xs` | `0 1px 2px rgba(19,19,18,.04)` | Cards au repos — quasi invisible |
| `--k-shadow-sm` | double ombre fine | Non observé en usage direct actuellement |
| `--k-shadow-md` | `0 8px 24px -6px rgba(19,19,18,.12)` | Non observé en usage direct actuellement |
| `--k-shadow-pop` | `0 16px 48px -12px rgba(12,12,12,.28)` | Modales (élément le plus élevé de l'UI) |

**Règle explicite (anti-slop)** : les cards utilisent `shadow-xs` + une bordure `1px
solid hairline` — **la bordure porte la séparation, pas l'ombre**. Ne jamais ajouter une
ombre « SaaS générique » (`shadow-lg`/`shadow-xl` Tailwind par défaut, floutée et grise)
à une card ou un composant de gestion. Seule la modale — qui doit se détacher du reste de
l'écran — a droit à une ombre marquée (`shadow-pop`).

---

## 7. Animations & transitions

| Token | Valeur |
|---|---|
| Easing unique | `--k-ease: cubic-bezier(0.2, 0, 0, 1)` (nommé `ease-karta` dans Tailwind) |
| Durée rapide | `--k-t-fast: 140ms` (backdrop de modale) |
| Durée standard | `--k-t-base: 180ms` (panneau de modale, transitions de composants) |

### Autorisé

- Transitions d'état sur `hover`/`focus`/`active` (couleur, bordure) : `transition
  duration-150 ease-karta`.
- Entrée de modale : `k-fade` (backdrop, opacité) + `k-pop` (panneau, translateY 8px +
  scale .985 → 1).
- Indicateur de chargement : `.spinner` (rotation), `.skeleton` (pulse Tailwind),
  `k-sweep` (filet lumineux qui traverse l'aperçu téléphone pendant un rafraîchissement).
- Barres de données (`.stat-fill`, `.chart-bar`) : **`transform: scaleX()/scaleY()`**,
  jamais `width`/`height` — un changement de `height`/`width` provoque un reflow à
  chaque frame ; `transform` reste sur le compositeur. Règle déjà appliquée et à
  respecter pour toute nouvelle barre/jauge.

### Interdit

- Animation décorative permanente (boucle infinie hors `k-sweep`, qui a une fonction de
  feedback précise et n'existe que pendant un chargement réel).
- Animer une propriété qui déclenche un recalcul de layout (`width`, `height`, `margin`,
  `top`/`left`) quand `transform`/`opacity` suffisent.
- Micro-interaction sans rôle (l'animation doit **expliquer un changement ou donner un
  retour**, jamais décorer).

`@media (prefers-reduced-motion: reduce)` réduit **toutes** les animations/transitions à
quasi zéro globalement — ne jamais contourner ce bloc pour une nouvelle animation.

---

## 8. Densité

Karta est un outil de gestion quotidien (menus, plats, QR, clients) — la densité cible
est **dense mais respirable**, pas un ERP tassé, pas un site vitrine aéré :

- Lignes de table : `py-2.5`/`py-3`, jamais `py-4`+.
- Cards de gestion : `p-4`/`p-5`, jamais `p-8`+.
- Un `card-accent` (filet persimmon de 3px) marque un KPI clé sans ajouter de bloc visuel.
- Exception assumée : le studio de style (`menu-design-studio`) et la page de connexion
  sont plus aérés — ce sont des écrans de configuration ponctuelle et d'accueil, pas de
  gestion répétée à haute fréquence.

**Test simple** : un écran de gestion (liste de clients, menu, plats) doit tenir un
maximum d'information utile au-dessus de la ligne de flottaison sans donner l'impression
d'un tableur — si l'espace blanc dépasse le contenu, c'est un signal de sur-espacement.

---

## 9. Responsive

Breakpoints Tailwind par défaut : `sm 640px` / `md 768px` / `lg 1024px` / `xl 1280px`.
Pas de breakpoint custom sauf le studio de style (`.preset-grid`, `.studio`), piloté par
la largeur de la **colonne**, pas du viewport (le studio partage l'écran avec l'aperçu).

| Élément | Comportement |
|---|---|
| Sidebar | Fixe `lg+` ; hors-écran + backdrop `<lg` |
| Tables (`data-table`) | Table `sm+` ; liste de cards empilées `<sm` |
| Aperçu téléphone | Largeur `min(17.5rem, formule liée à 100dvh)`, jamais plus grand que l'écran utile ; `19.5rem` dès `xl` |
| Graphique de scans | `h-40` → `h-48` (`sm+`), `gap-[2px]` → `gap-1` |
| Toute table | Encapsulée dans `overflow-x-auto` — jamais de débordement horizontal de page |

**Priorité explicite 390px** (mentionnée dans le rendu public `menu.html`, cible réelle
d'un téléphone à table) : le texte long (description de plat, nom de catégorie) porte la
classe `k-wrap` côté rendu public pour forcer la coupure — aucune interface, back-office
ou publique, ne doit produire de débordement horizontal à cette largeur.

---

## 10. Accessibilité

Déjà en place dans le code existant — à préserver, pas à réinventer :

- Lien d'évitement (« Aller au contenu ») en tête de layout, visible au focus seulement
  (`sr-only focus:not-sr-only`).
- **Toute** cible interactive a un état focus visible : `focus-visible:ring-2` teinté
  `--k-persimmon-ring`, jamais de `outline: none` sans remplacement.
- `aria-expanded` sur le bouton de menu mobile, `aria-current="page"` sur le fil
  d'Ariane, `aria-hidden="true"` sur les SVG et backdrops décoratifs.
- Modales : `role="dialog"` + `aria-modal="true"` + `aria-labelledby` vers le titre.
- Boutons désactivés utilisent l'attribut natif `disabled` (jamais une classe visuelle
  seule) — `.btn` gère `disabled:opacity-50 disabled:pointer-events-none`.
- Le statut n'est **jamais porté par la couleur seule** : chaque badge combine couleur +
  point (`badge-dot`) + libellé texte.
- `prefers-reduced-motion` respecté globalement (§7).

**À définir** : audit de contraste chiffré (WCAG AA) sur l'ensemble des paires
couleur/fond, navigation clavier complète du studio de style (glisser-déposer de
couleur), tests avec lecteur d'écran.

---

## 11. Composants

### Boutons

| Variante | Fond | Usage |
|---|---|---|
| `.btn-primary` | `persimmon` | **Une seule action primaire par écran/section** |
| `.btn-secondary` | `charcoal` | Action secondaire marquée |
| `.btn-outline` | blanc + bordure `ink-200` | Action secondaire par défaut (le plus courant) |
| `.btn-ghost` | transparent | Action tertiaire, discrète (Annuler, actions de ligne) |
| `.btn-danger` / `.btn-danger-soft` | rouge plein / rouge sur blanc | Suppression |
| `.btn-icon` | transparent, carré | Icône seule (burger menu, fermeture) |

Tailles : défaut et `.btn-sm` (contexte compact : lignes de liste, headers de card).

### Inputs

`.input`, `.select`, `.search-input` (avec icône) — un seul traitement de focus dans tout
le projet (bordure `persimmon` + `ring` `persimmon-ring`). Pas de composant `switch`
séparé identifié : les booléens (ex. disponibilité d'un plat) sont rendus en **bouton
toggle textuel** (`● Disponible` / `○ Indisponible`), pas en `<input type="checkbox">`
stylé — `À définir` si un vrai composant switch/checkbox doit être introduit.

### Cards

`.card` + `.card-pad`/`.card-head`. **Quand utiliser** : regrouper un ensemble
d'information ou d'actions liées (une section de page, un KPI, une ligne de studio).
**Quand ne PAS utiliser** : ne jamais imbriquer une card dans une card pour créer une
hiérarchie visuelle — utiliser un `card-head`/section-title, une bordure interne
(`border-t hairline`), ou un simple espacement. Aucune imbrication de cards observée
dans le code actuel — à ne pas introduire.

### Badges

Deux familles distinctes, ne pas les confondre :
- **Offre** (`badge-basic`/`badge-pro`/`badge-premium`) : traitement **matière**
  métallique sobre — bronze/cuivre (BASIC), argent/chrome (PRO), or (PREMIUM) — dégradé
  discret + liseré interne, sans reflet marqué ni motif décoratif. Libellé affiché =
  nom réel de l'offre (`BASIC`/`PRO`/`PREMIUM`), jamais renommé en "Bronze/Argent/Or" ni
  accompagné d'emoji/pictogramme médaille (voir exception §2). La hiérarchie de valeur
  (bronze < argent < or) reste lisible par la matière, pas par un renommage.
- **Statut** (`badge-active`/`inactive`/`ready`/`published`/`draft`) : couleur
  sémantique + `badge-dot`.

### Feedback

`.alert-error` / `.alert-warning` / `.alert-info` (fond teinté + bordure + texte
contrasté) pour les messages de niveau page/section. `.save-hint` (texte vert discret,
pas un toast) pour une confirmation d'enregistrement in situ.

### Empty states

Motif unique et systématique : `.empty-state` (icône dans `.empty-state-icon` + titre +
description + CTA optionnel), centré, utilisé identiquement sur Dashboard, liste
clients, éditeur de menu.

### Loading states

`.skeleton` (formes grises pulsées, reproduisant la mise en page finale) pour un premier
chargement de page/section ; `.spinner` (rotation) pour une action ponctuelle (bouton en
cours, aperçu en rafraîchissement).

### Dialogs

`.modal-backdrop` + `.modal-panel` : feuille du bas sur mobile (`items-end`, coins
arrondis en haut seulement), dialogue centré dès `sm`. **Aucun composant drawer distinct
n'existe** dans le projet actuel — `À définir` si un besoin de panneau latéral apparaît ;
ne pas en introduire un sans nécessité avérée (réutiliser la modale existante d'abord).

### Tables / listes

`.data-table` (desktop) — en-têtes mono capitales, lignes cliquables (`row-link`) avec
hover `canvas`. Bascule systématique vers une liste de `.card` empilées sous `sm` : ne
jamais faire défiler horizontalement une table de gestion sur mobile.

### Onglets

`.tablist`/`.tab`/`.tab-active` (soulignement persimmon) — utilisés sur la fiche client
(Vue d'ensemble / QR / Menu / Statistiques).

### Studio de style (spécifique)

`.preset-grid`/`.preset-card` : sélecteur des 5 presets avec swatch fidèle aux couleurs
réelles du renderer (jamais une couleur décorative qui mentirait sur le rendu). Voir §13.

---

## 12. Menu Karta : contenu ≠ présentation

```text
Menu JSON (catégories, plats, prix, disponibilité)
        │  MenuStructureService — jamais de couleur/style ici
        ▼
PublicMenuService.assemble()
        │
        ▼
MenuThemeResolver ──► MenuTheme (couleurs, densité, police du preset + surcharge PREMIUM)
        │
        ▼
MenuRenderer (Thymeleaf, templates/menu/menu.html)
        │
        ▼
Menu public (/m/{code}) ou aperçu admin (studio, iframe téléphone)
```

**Le contenu ne connaît jamais le style.** `MenuStructureService` ignore tout des
presets ; `MenuPreset` (backend) ignore tout du contenu. Un même menu, rendu avec deux
presets différents, produit exactement les mêmes catégories/plats/prix — seules
couleurs, densité et police changent.

### 5 presets (`MenuPreset.java`)

| Preset | Fond | Accent | Texte | Densité | Police |
|---|---|---|---|---|---|
| Modern *(défaut)* | `#FFFFFF` | `#F05A00` | `#131312` | Éditorial | Sans |
| Dark | `#131312` | `#012FA4` | `#FFFFFF` | Éditorial | Sans |
| Street Food | `#131312` | `#DC2626` | `#FFFFFF` | Compact | Sans |
| Minimal | `#FFFFFF` | `#131312` | `#131312` | Aéré | Sans |
| Luxe | `#131312` | `#C9A96E` | `#F5EDD8` | Élégant | Serif |

Ajouter un preset = ajouter une valeur dans cet enum (aucun template supplémentaire,
aucun autre service à toucher — voir le Javadoc de `MenuPreset`).

### Aperçu = rendu réel

Le studio (`menu-design-studio`) n'affiche **jamais** un menu reconstruit côté Angular :
l'iframe téléphone charge le HTML produit par `MenuRenderer`, le même que la page
publique. Deux rendus séparés finiraient par diverger — ne jamais dupliquer le renderer
côté frontend.

---

## 13. Offres : BASIC / PRO / PREMIUM

**Une seule UI, jamais trois systèmes visuels.** Les différences sont des
**fonctionnalités activées**, pas des interfaces distinctes — mêmes composants
(`.card`, `.btn-*`, `.badge-*`) partout.

| | BASIC | PRO | PREMIUM |
|---|---|---|---|
| Menu | PDF (upload/publier) | Structuré (éditeur + 5 presets) | Structuré (éditeur + 5 presets) |
| Éditeur de contenu | — | `MenuEditorComponent` | `MenuEditorComponent` (identique) |
| Studio de style | — | Choix de preset uniquement | Preset + personnalisation |
| Personnalisation (nom, couleurs, logo, image d'en-tête) | — | Bloqué, badge « Réservée à Premium » | Débloqué, badge « Premium » |
| KartaAI | — | Disponible, facultatif | Disponible, facultatif |

L'écran désactivé pour PRO (personnalisation) reste **visible mais grisé/badgé**, jamais
masqué sans explication — le restaurateur voit ce à quoi une montée en gamme donnerait
accès.

---

## 14. Principes de design

1. **Premium et sobre**, pas décoratif — un outil sérieux pour de vrais restaurateurs.
2. **Restaurant-tech** : cartographique/technique (`.k-crosshair`, `.k-ticks`, mono pour
   la donnée) plutôt que « lifestyle food ».
3. **Une seule couleur d'accent fonctionnelle** (persimmon) — jamais une seconde couleur
   vive en concurrence pour CTA/liens/focus. Exception scopée et documentée : le dégradé
   métallique des badges d'offre (§2, §11), qui est une matière, pas un accent.
4. **La bordure porte la structure, pas l'ombre** — cards quasi plates (§6).
5. **Dense mais respirable** (§8) — pas un ERP, pas un site vitrine.
6. **Clarté → Action → Feedback**, jamais la décoration en premier (§15).
7. **Le rendu public fait foi** — un aperçu ment si ce n'est pas littéralement le même
   HTML que ce que le client final verra (§12).

### Anti-slop — à éviter explicitement

- Dégradé violet/bleu générique, glassmorphism, blobs décoratifs.
- Cards imbriquées sans raison, boutons "pill" systématiques, radius excessif au-delà
  de `12px` sur un composant de gestion.
- Emoji comme élément d'UI principal (les icônes sont des SVG inline, cohérentes,
  `stroke-width` 1.6–1.9).
- Ombres lourdes façon SaaS générique (voir §6).
- Animation permanente sans fonction, micro-interaction gratuite.
- Duplication visuelle d'un même composant sous une forme légèrement différente.
- Espaces énormes sans rôle (au-delà du rythme `3–6` en contexte de gestion, §4/§8).
- Layout qui ressemble à un dashboard IA générique — chaque écran doit avoir une raison
  précise d'être agencé ainsi, pas un patron réutilisé sans réflexion.

**Le design doit sembler intentionnel et spécifique à Karta**, pas un template.

---

## 15. Product design

Un restaurateur doit toujours pouvoir répondre, en un coup d'œil, à :

- où il se trouve (fil d'Ariane + `page-title`) ;
- ce qu'il peut modifier (état des champs, boutons actifs) ;
- ce qui est enregistré vs publié — la distinction **Save ≠ Publish** est structurelle
  (voir `docs/MENU_STRUCTURED.md`, `menu-design-studio`, `menu-editor`) : enregistrer
  n'expose jamais automatiquement au public ; publier est toujours une action séparée et
  explicite ;
- ce qui est visible publiquement vs en brouillon (`badge-draft`/`ready`/`published`) ;
- ce qui est indisponible (badge dédié, jamais un plat simplement masqué) ;
- ce qui nécessite une action (`studio-dot-pending` + « Modifications non
  enregistrées »).

Ordre de priorité systématique : **Clarté d'abord, puis l'action à accomplir, puis le
retour visuel de son résultat** — jamais la décoration en premier.

---

## 16. États UI

| État | Convention |
|---|---|
| Default | Styles de base des composants (§11) |
| Hover | Assombrissement/éclaircissement léger, `duration-150 ease-karta` |
| Focus | `focus-visible:ring-2` `persimmon-ring`, jamais supprimé |
| Active | `.btn:active` : `translateY(0.5px)` (retour tactile minimal) |
| Disabled | Attribut natif + `opacity-50 pointer-events-none` |
| Loading | `.skeleton` (premier chargement) / `.spinner` (action ponctuelle) |
| Success | `.save-hint` (texte), `badge-active`/`published` (statut) |
| Error | `.alert-error`, jamais un message qui disparaît sans que l'utilisateur ait pu agir |
| Empty | `.empty-state` systématique, jamais un tableau simplement vide |
| Dirty / Unsaved | `studio-dot-pending` (persimmon) + libellé explicite, bouton
  d'enregistrement actif seulement si un changement réel existe |

---

## 17. Règle de cohérence — *Reuse before create*

Avant d'introduire :

- une nouvelle couleur → vérifier `--k-persimmon`/`success`/`warning`/`danger`/l'échelle
  `ink-*` (§2) ;
- une nouvelle police → il n'y en a que deux, verrouillées (§1) ;
- un nouveau radius → `xs/sm/md/lg` couvre déjà tout (§5) ;
- une nouvelle ombre → `xs` (cards) et `pop` (modales) suffisent (§6) ;
- un nouveau composant → relire §11, la variante existe probablement déjà ;
- une nouvelle animation → `k-fade`/`k-pop`/`k-sweep` + easing unique (§7) ;
- une nouvelle dépendance UI → il n'y en a aucune ; ne pas en ajouter une pour un besoin
  ponctuel.

> Un token ou motif existant qui peut couvrir le besoin doit toujours être préféré à sa
> recréation.

---

## 18. Guidance pour Impeccable

1. Toujours lire ce `DESIGN.md` avant de proposer une modification UI.
2. Préserver les tokens existants (`styles.css` + `tailwind.config.js` — les deux à la
   fois si un token change).
3. Préserver **Plus Jakarta Sans** (UI) et **Geist Mono** (données/ID) — règles de
   marque, pas des choix à auditer.
4. Ne pas supprimer `.k-crosshair`/`.k-ticks` au prétexte d'un motif répétitif détecté —
   ce sont des motifs d'identité assumés (§1).
5. Ne pas introduire de librairie UI — **PrimeNG n'est pas utilisé dans ce projet**;
   réutiliser le système de composants Tailwind/CSS existant (§11).
6. Préférer une modification ciblée à une refonte globale.
7. Ne pas modifier plusieurs pages pour corriger un problème local à une seule.
8. Tester en responsive, en particulier **390px** (§9).
9. Vérifier les états loading/error/empty/success/dirty pour tout composant touché (§16).
10. Vérifier la lisibilité réelle dans le navigateur, pas seulement dans le code.
11. `Reuse before create` (§17) avant toute nouvelle valeur/composant/pattern.
12. Le rendu du menu public doit rester la seule source de vérité visuelle de ce que
    voit un client final — jamais de reconstruction Angular parallèle (§12).

---

## 19. Détecteurs — exceptions déjà actées

Configuration réelle : `.impeccable/config.json` (ne pas dupliquer ces règles ailleurs,
ce fichier fait foi). État au moment de la rédaction :

| Détecteur | Valeur/fichier | Raison |
|---|---|---|
| `broken-image` | `*` sur `restaurant-detail.component.html` | `[src]` est lié à une data URL `FileReader` (`qrImageDataUrl()`), gardée par `@if` — jamais vide au rendu |
| `overused-font` | `plus jakarta sans` | Police de marque Karta imposée, verrouillée |
| `overused-font` | `geist mono` | Police de marque Karta pour données/ID/technique, verrouillée |
| `codex-grid-background` | `*` sur `admin-frontend/src/styles.css` | `.k-crosshair` est le motif d'enregistrement Karta, volontaire (§1) |

**Ne pas créer de nouvelle exception uniquement pour faire disparaître un avertissement.**
Une exception doit correspondre soit à une vraie décision de design documentée ici, soit
à un faux positif technique démontrable (comme `broken-image` ci-dessus). En cas de
doute, corriger le problème plutôt que l'ignorer.

---

*Document à maintenir à jour manuellement quand un token change dans `styles.css` /
`tailwind.config.js`, ou qu'un nouveau composant/motif est introduit délibérément.*
