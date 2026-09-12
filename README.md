# Karta — Frontend

Frontend Angular de Karta : la landing publique, la connexion, et le back-office
privé (restaurants, QR, statistiques, menu structuré, studio de design).

Le menu public (`/m/{code}`) et la redirection QR (`/q/{code}`) ne sont **pas**
servis par ce projet : ils sont rendus par le backend Spring Boot, dans le
repository séparé `Karta-backend`.

## Prérequis

- Node.js 18.19+ (ou 20+)
- npm

## Installation et lancement

```bash
npm ci                # ou npm install
npm start             # dev server sur http://localhost:4200
```

Le dev server attend le backend sur `http://localhost:8080`
(voir `src/environments/environment.ts`).

## Build

```bash
npm run build
```

Sortie : `dist/frontend/browser/` — des fichiers statiques (prérendu à la
compilation, `outputMode: static` ; aucun serveur SSR à l'exécution).

## Déploiement (Cloudflare Pages)

- **Build output directory** : `dist/frontend/browser/`
- **Build command** : `npm ci && npm run build`

`npm run build` = `ng build` (prérendu statique) **puis**
`scripts/postbuild-cloudflare.mjs`, qui prépare le dossier pour Cloudflare Pages :

| Chemin | Rôle |
|---|---|
| `index.html`, `pricing/index.html`, … | 6 routes publiques **prérendues**, servies telles quelles |
| `index.csr.html` | coquille cliente vide (routes rendues côté navigateur) |
| `app-shell/index.html` | **copie** de `index.csr.html`, cible « propre » (répertoire, sans `.html`) des règles `_redirects` |
| `404.html` | **copie** de `index.csr.html` : repli pour toute URL inconnue |
| `_redirects` | règles **scopées** vers `/app-shell/` pour `/login`, `/admin/**`, `/app/**` et `/onboarding/**` |

```
# public/_redirects
/login       /app-shell/    200
/admin       /app-shell/    200
/admin/*     /app-shell/    200
/app         /app-shell/    200
/app/*       /app-shell/    200
/onboarding  /app-shell/    200
/onboarding/*  /app-shell/  200
```

**Pourquoi pas `/*  /index.csr.html  200` :** sur Cloudflare Pages une règle
`_redirects` s'applique *même si un asset existe* (un `/*` masquerait les pages
prérendues) et Cloudflare redirige tout `*.html` en **307** vers l'URL sans
extension. `/*  /index.csr.html  200` menait donc à
`/` → `/index.csr.html` → 307 `/index.csr` → `/*` → `/index.csr.html` → … =
**`ERR_TOO_MANY_REDIRECTS`**. Cibler un répertoire (`/app-shell/`) et scoper aux
routes client évite les deux pièges.

**Dashboard Cloudflare :** ne PAS activer l'option « Single Page Application »
(elle ajouterait un repli global vers `index.html`, la landing prérendue). La
présence de `404.html` désactive de toute façon ce mode implicite. Vérifier que
le mode SSL/TLS est **Full** (ou Full Strict), jamais *Flexible* — *Flexible*
provoque aussi une boucle HTTP↔HTTPS sur le domaine.

Régression couverte par `e2e/production-spa-fallback.spec.ts` (simulateur
Cloudflare Pages dans `e2e/cf-pages-server.ts`).

## Tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

## Configuration de l'API

L'URL du backend est définie par `apiBaseUrl` :

| Fichier | Valeur | Usage |
|---|---|---|
| `src/environments/environment.ts` | `http://localhost:8080` | développement |
| `src/environments/environment.prod.ts` | `https://api.kartaqr.fr` | production |

Le frontend est déployé sur Cloudflare (`https://kartaqr.fr`) et le backend sur
un VPS (`https://api.kartaqr.fr`) : **domaines distincts**. En conséquence :

1. `environment.prod.ts` contient l'URL absolue du backend ;
2. l'origine `https://kartaqr.fr` est déclarée dans `cors.allowed-origins`
   côté backend (`application-prod.yml` / `CORS_ALLOWED_ORIGINS`).

## Routes

| Route | Accès | Contenu |
|---|---|---|
| `/` | public | landing Karta |
| `/landing` | public | alias de `/` |
| `/login` | public | connexion |
| `/admin/**` | privé (`authGuard`) | back-office Karta |
| `/onboarding/**` | privé (restaurateur) | parcours de configuration d'un nouveau restaurant |
| `/app/**` | privé (restaurateur) | Espace Restaurateur |

L'espace `/admin/**` est réservé à l'administrateur de Karta. Le guard Angular
est un confort d'UX : la protection réelle est appliquée par le backend sur
`/api/admin/**`.

L'espace `/app/:restaurantId/**` est l'atelier du restaurateur. Le rôle et le
restaurant du compte connecté viennent de `GET /api/admin/me` ; l'identifiant
présent dans l'URL n'est **jamais** une autorisation (`restaurantAccessGuard` le
confronte à l'identité, et `RestaurateurScopeFilter` refuse côté serveur).

Trois gardes se répartissent la frontière :

| Garde | Rôle |
|---|---|
| `authGuard` | être connecté ; transmet l'URL demandée à `/login` (`?next=`) |
| `adminGuard` | `/admin/**` réservé à Karta |
| `restaurateurGuard` / `restaurantAccessGuard` | `/app/**` et `/onboarding/**` réservés au restaurateur, et à SON restaurant |
| `onboardingGuard` | tant que le menu n'a jamais été publié, `/app/**` renvoie vers `/onboarding` |

`?next=` n'est honoré que s'il est atteignable par le compte qui vient d'entrer
(voir `isReachableBy`) : un écran demandé par la session précédente ne décide
jamais où atterrit la suivante.

L'onboarding est terminé quand le menu a été publié une première fois :
`restaurants.onboarding_completed_at` (migration V8), posé côté serveur par
`MenuService.publish` et jamais retiré. Rien n'est mémorisé dans le navigateur —
changer d'appareil ne remet personne au début.

## Design

Le système de design (tokens, typographie, composants, presets) est documenté
dans [`DESIGN.md`](./DESIGN.md). Ne pas introduire de couleur, d'espacement ou
de police hors de ces tokens.
