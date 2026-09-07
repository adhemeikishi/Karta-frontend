/**
 * Post-build — préparation du déploiement Cloudflare Pages.
 *
 * Le build (`outputMode: static`) produit :
 *   - un HTML prérendu par route publique (`index.html`, `pricing/index.html`, …) ;
 *   - `index.csr.html` : la coquille cliente vide, pour les routes rendues côté
 *     navigateur (`/login`, `/admin/**`).
 *
 * Cloudflare Pages ne sait pas seul quand servir `index.csr.html`. Et on ne peut pas
 * le viser depuis `_redirects` : Cloudflare redirige tout chemin `*.html` (307) vers
 * sa version sans extension — `/index.csr.html` → `/index.csr` → … → boucle
 * `ERR_TOO_MANY_REDIRECTS`.
 *
 * On copie donc la coquille vers des cibles « propres » (sans extension `.html`) :
 *
 *   app-shell/index.html  cible des règles `_redirects` (`/login`, `/admin/*` → `/app-shell/`).
 *                         Un répertoire servi via `/app-shell/` ne subit aucune
 *                         redirection de normalisation.
 *   404.html              repli Cloudflare pour toute URL sans asset ni règle. Sa
 *                         présence désactive aussi le « mode SPA implicite » de
 *                         Cloudflare (qui, sinon, servirait la landing prérendue
 *                         pour n'importe quel chemin).
 *
 * `index.csr.html` et les pages prérendues ne sont pas touchés.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const browserDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'frontend', 'browser');
const shell = join(browserDir, 'index.csr.html');

if (!existsSync(shell)) {
  console.error(`postbuild-cloudflare: ${shell} introuvable — le build a-t-il produit index.csr.html ?`);
  process.exit(1);
}

mkdirSync(join(browserDir, 'app-shell'), { recursive: true });
copyFileSync(shell, join(browserDir, 'app-shell', 'index.html'));
copyFileSync(shell, join(browserDir, '404.html'));

console.log('postbuild-cloudflare: app-shell/index.html + 404.html créés depuis index.csr.html');
