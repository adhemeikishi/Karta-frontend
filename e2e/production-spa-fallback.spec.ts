import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startCfPagesServer, type CfPagesServer } from './cf-pages-server';

/**
 * Régression production (Cloudflare Pages). Le frontend est un build statique
 * (`outputMode: static`) :
 *   - 6 routes publiques PRÉRENDUES (un fichier HTML chacune) ;
 *   - `/login` et `/admin/**` rendues CÔTÉ CLIENT (coquille `index.csr.html`).
 *
 * Historique des incidents que ce test verrouille :
 *   1. sans `_redirects` : `kartaqr.fr/login` → **404** (aucun fichier `/login`).
 *   2. avec `_redirects: /*  /index.csr.html  200` : **ERR_TOO_MANY_REDIRECTS** sur
 *      TOUTES les routes, y compris `/`. Cause : `_redirects` s'applique même quand
 *      un asset existe (le `/*` masque les pages prérendues) ET Cloudflare redirige
 *      `*.html` (307) vers l'URL sans extension → `/index.csr.html` → `/index.csr`
 *      → règle `/*` → `/index.csr.html` → 307 → … boucle infinie.
 *
 * Correctif : règles `_redirects` SCOPÉES (`/login`, `/admin`, `/admin/*`) pointant
 * vers le RÉPERTOIRE `/app-shell/` (copie de `index.csr.html`, sans extension `.html`)
 * + `404.html` pour les URL inconnues.
 *
 * `e2e/cf-pages-server.ts` reproduit ces comportements Cloudflare (normalisation
 * d'URL HTML comprise) sur la vraie sortie de `npm run build`.
 */

const DIST = join(__dirname, '..', 'dist', 'frontend', 'browser');
let server: CfPagesServer;

test.describe('Cloudflare Pages — build de production', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'hébergement — projet chromium uniquement');
  });

  test.beforeAll(async ({}, workerInfo) => {
    if (workerInfo.project.name !== 'chromium') return;
    if (!existsSync(join(DIST, 'index.csr.html')) || !existsSync(join(DIST, 'app-shell', 'index.html'))) {
      execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'inherit', timeout: 240_000 });
    }
    server = await startCfPagesServer(DIST);
  });

  test.afterAll(async () => {
    await server?.close();
  });

  // ---------------------------------------------------------------- sortie de build

  test('le build produit la coquille cliente et ses cibles Cloudflare', () => {
    expect(existsSync(join(DIST, 'index.csr.html'))).toBe(true);
    expect(existsSync(join(DIST, 'app-shell', 'index.html'))).toBe(true);
    expect(existsSync(join(DIST, '404.html'))).toBe(true);
    // app-shell et 404.html sont bien la coquille cliente (app-root vide).
    for (const f of ['app-shell/index.html', '404.html']) {
      expect(readFileSync(join(DIST, f), 'utf8')).toContain('<app-root></app-root>');
    }
  });

  test('`_redirects` ne réintroduit pas le motif qui bouclait', () => {
    const lines = readFileSync(join(DIST, '_redirects'), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    for (const line of lines) {
      const [from, to] = line.split(/\s+/);
      // pas de splat global : masquerait les pages prérendues + rattraperait la boucle
      expect(from, `règle trop large : ${line}`).not.toBe('/*');
      // pas de cible `.html` : Cloudflare la redirige (307) vers l'URL sans extension
      expect(to, `cible .html interdite (boucle 307) : ${line}`).not.toMatch(/\.html$/);
    }
    // les routes client sont bien couvertes
    expect(lines.join('\n')).toMatch(/^\/login\s+\/app-shell\/\s+200$/m);
    expect(lines.join('\n')).toMatch(/^\/admin\/\*\s+\/app-shell\/\s+200$/m);
  });

  // ---------------------------------------------------------------- pas de boucle

  test('aucune route ne boucle (suivi des redirections jusqu’au bout)', async ({ request }) => {
    for (const path of ['/', '/pricing', '/login', '/admin', '/admin/restaurants/42', '/inexistant']) {
      const res = await request.get(server.url + path, { maxRedirects: 20 });
      // request.get lève une erreur au-delà de maxRedirects → si on est ici, pas de boucle
      expect([200, 404], `${path} : statut inattendu`).toContain(res.status());
    }
  });

  // ---------------------------------------------------------------- routes prérendues

  test('les 6 routes publiques servent leur HTML prérendu', async ({ request }) => {
    const expected: Record<string, RegExp> = {
      '/': /Le menu digital par QR code — Karta/,
      '/landing': /Le menu digital par QR code — Karta/,
      '/pricing': /Tarifs — Karta/,
      '/features': /Fonctionnalités — Karta/,
      '/faq': /FAQ — Karta/,
      '/contact': /Contact — Karta/,
    };
    for (const [path, title] of Object.entries(expected)) {
      const res = await request.get(server.url + path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(html, `${path} : HTML prérendu attendu`).toMatch(title);
      expect(html, `${path} : ne doit pas être la coquille cliente vide`).not.toContain(
        '<app-root></app-root>',
      );
    }
    expect(await (await request.get(server.url + '/pricing')).text()).toContain(
      'Trois offres. PRO pour la plupart',
    );
  });

  // ---------------------------------------------------------------- /login (cible du bug)

  test('`/login` répond 200 (sans boucle) et affiche le LoginComponent', async ({ page }) => {
    const res = await page.goto(server.url + '/login');
    expect(res?.status(), 'statut HTTP de /login').toBe(200);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel("Nom d'utilisateur")).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  // ---------------------------------------------------------------- /admin

  test('`/admin` répond 200 puis le guard renvoie vers `/login`', async ({ page }) => {
    const res = await page.goto(server.url + '/admin');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  });

  test('`/admin/restaurants/42` (route profonde) répond 200 et charge l’app', async ({ page }) => {
    const res = await page.goto(server.url + '/admin/restaurants/42');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login$/);
  });

  // ---------------------------------------------------------------- URL inconnue

  test('une URL inconnue charge l’app (via 404.html) et revient à l’accueil, sans boucle', async ({
    page,
  }) => {
    const res = await page.goto(server.url + '/cette-route-nexiste-pas');
    // Cloudflare sert 404.html (statut 404) — contenu = l'app, qui redirige vers /
    expect(res?.status()).toBe(404);
    await expect(page).toHaveURL(server.url + '/');
    await expect(
      page
        .getByRole('button', { name: 'Ouvrir le menu' })
        .or(page.getByRole('navigation', { name: 'Navigation principale', exact: true })),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------- assets

  test('les assets statiques restent servis directement', async ({ request }) => {
    const robots = await request.get(server.url + '/robots.txt');
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).not.toContain('<app-root');

    const css = await request.get(server.url + '/styles-' + cssHash() + '.css');
    expect(css.status()).toBe(200);
    expect(css.headers()['content-type']).toContain('text/css');
  });
});

/** Nom hashé du bundle CSS, lu dans l'index prérendu. */
function cssHash(): string {
  const m = readFileSync(join(DIST, 'index.html'), 'utf8').match(/styles-([A-Z0-9]+)\.css/i);
  if (!m) throw new Error('bundle CSS introuvable dans index.html');
  return m[1];
}
