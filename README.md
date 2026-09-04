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

Sortie : `dist/frontend/browser/` — des fichiers statiques, sans SSR.

## Tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

## Configuration de l'API

L'URL du backend est définie par `apiBaseUrl` :

| Fichier | Valeur | Usage |
|---|---|---|
| `src/environments/environment.ts` | `http://localhost:8080` | développement |
| `src/environments/environment.prod.ts` | `''` (relatif) | production |

`''` suppose que le frontend et l'API sont servis **depuis le même domaine**.
Si le frontend est déployé sur un domaine distinct (Cloudflare) et le backend
sur un autre (VPS), il faut :

1. mettre l'URL absolue du backend dans `environment.prod.ts` ;
2. déclarer l'origine du frontend dans `cors.allowed-origins` côté backend.

## Routes

| Route | Accès | Contenu |
|---|---|---|
| `/` | public | landing Karta |
| `/landing` | public | alias de `/` |
| `/login` | public | connexion |
| `/admin/**` | privé (`authGuard`) | back-office |

L'espace `/admin/**` est réservé à l'administrateur de Karta. Le guard Angular
est un confort d'UX : la protection réelle est appliquée par le backend sur
`/api/admin/**`.

## Design

Le système de design (tokens, typographie, composants, presets) est documenté
dans [`DESIGN.md`](./DESIGN.md). Ne pas introduire de couleur, d'espacement ou
de police hors de ces tokens.
