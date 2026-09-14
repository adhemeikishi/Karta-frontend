# Karta — Frontend

## Périmètre

Le frontend couvre aujourd'hui, en production de code (vérifié par lecture
directe, audit du 2026-09-14) :

- landing page publique + parcours de démonstration KartaAI (`/create/*`,
  `/karta-ai`) — **c'est une démo marketing assumée** : aucun PDF n'est
  réellement envoyé, contenu d'exemple statique, animation chronométrée.
  Le rattachement du brouillon à un compte réel n'est PAS implémenté
  (`creation-draft.service.ts:attachToAccount` est un stub documenté).
- login (Basic Auth, identifiants en sessionStorage)
- onboarding restaurateur réel et connecté (`/onboarding/*`) : import PDF,
  extraction KartaAI, review, style, publication, QR — entièrement branché
  au backend, état recalculé serveur (aucune progression stockée client)
- Espace Restaurateur (`/app/:restaurantId/*`) : menu, design, QR, statistiques
  — fonctionnel, branché sur de vrais endpoints
- back-office admin privé (`/admin/**`)
- affichage des offres/tarifs (contenu marketing statique, pas de facturation)

**Toujours hors périmètre, sans demande explicite** :

- paiement réel / Stripe / Karta Pay (aucune intégration aujourd'hui ; tous
  les CTA d'offre pointent vers `/contact`, jamais vers un checkout)
- inscription en libre-service (pas de tunnel `/create` → compte automatique)
- commandes, panier, KDS, imprimantes, fidélité, système d'avis

Ne pas ajouter sans demande explicite : les éléments ci-dessus.

## Stack réelle (corrigée)

- Angular 19.2 standalone (pas Angular 21)
- Tailwind CSS — **aucune dépendance PrimeNG** (confirmé par `DESIGN.md`
  et `package.json`)
- Playwright (e2e) + Karma/Jasmine (unitaire)

## Commandes

(inchangé)

## Architecture

Backend package-by-feature : restaurant, qrcode, qrscan, redirect, menu,
kartaai, media, admin, common (voir CLAUDE.md du repo Karta-backend).

Frontend :

- Angular standalone, lazy-loading sur toutes les routes
- 6 routes publiques prérendues statiquement, tout le reste en rendu client
- services + models + components
- Basic Auth (pas JWT) : `auth.service.ts` encode `btoa(username:password)`,
  stocké en `sessionStorage`, réémis à chaque requête via `auth.interceptor.ts`
- guards `authGuard`/`adminGuard`/`restaurateurGuard`/`restaurantAccessGuard`/
  `onboardingGuard` : protection **UX uniquement**, la vraie sécurité est
  côté backend (`RestaurateurScopeFilter`)

Base de données : voir CLAUDE.md backend (le frontend n'y accède jamais
directement).

(reste des sections Conventions / Sécurité / Méthode de travail / 21st.dev :
inchangé)
