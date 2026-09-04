# Karta — Frontend (V1)

## Périmètre

La V1 doit rester volontairement minimale :

- landing page publique (Karta est le produit)
- login
- back-office privé (restaurants, QR, statistiques, menu, design)

Le menu public et la redirection QR sont rendus par le backend
(repository séparé `Karta-backend`), pas par ce projet.

Ne pas ajouter sans demande explicite :

- commandes
- panier
- paiement
- Stripe
- comptes restaurants
- abonnements
- KDS
- imprimantes
- fidélité
- IA
- système d'avis
- fonctionnalités V2

## Commandes

Depuis la racine de ce repository :

- `npm ci`
- `npm run build` (sortie : `dist/frontend/browser/`)
- `npx ng test --watch=false --browsers=ChromeHeadless`
- `npm start` (dev server sur http://localhost:4200)

## Architecture

Backend package-by-feature :

- restaurant
- qrcode
- qrscan
- redirect
- admin
- common

Frontend :

- Angular standalone
- Tailwind CSS
- services + models + components
- auth guard + HTTP interceptor

Base de données :

- PostgreSQL
- Flyway
- migrations dans `backend/src/main/resources/db/migration`
- ne jamais modifier une migration déjà livrée ; créer une nouvelle migration

## Conventions

- conserver l'architecture actuelle ;
- privilégier les modifications ciblées ;
- ne pas ajouter de dépendance inutile ;
- messages destinés à l'utilisateur en français ;
- ne jamais mettre de secret dans le code ou Git ;
- `.env` reste ignoré ;
- conserver la configuration par variables d'environnement ;
- ne pas introduire de valeurs par défaut dangereuses en production.

## Sécurité

- ne jamais considérer qu'une route cachée protège quoi que ce soit :
  la protection réelle est côté backend ;
- `authGuard` reste obligatoire sur `/admin/**` ;
- ne jamais stocker de secret dans le code ou dans `environment*.ts` ;
- ne pas exposer d'identifiants de dev en production
  (`environment.prod.ts` n'a pas de `devAutoLogin`).

## Méthode de travail

Avant toute modification importante :

1. lire les fichiers concernés ;
2. comprendre l'architecture existante ;
3. identifier les impacts ;
4. modifier uniquement ce qui est nécessaire ;
5. lancer les tests/build concernés ;
6. signaler les fichiers modifiés ;
7. ne jamais supprimer une fonctionnalité existante sans raison.

Avant chaque déploiement :

- lancer la revue `/security-review` lorsqu'elle est disponible.

IMPORTANT :
Le projet est volontairement petit et V1.
Ne pas sur-ingénieriser.
Ne pas anticiper inutilement la V2.
Ne pas transformer le projet en architecture complexe.
