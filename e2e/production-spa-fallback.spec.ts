import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startCfPagesServer, type CfPagesServer } from './cf-pages-server';

/**
 * Régression production : le frontend est un build statique (`outputMode: static`)
 * hébergé sur Cloudflare Pages. Les 6 routes publiques sont prérendues (un fichier
 * chacune) ; `/login` et `/admin/**` sont rendues côté client et n'ont **aucun
 * fichier** — elles dépendent entièrement du repli `public/_redirects` :
 *
 *     /*    /index.csr.html    200
 *
 * Sans ce fichier, `https://kartaqr.fr/login` renvoyait `HTTP 404` : Cloudflare ne
 * trouvait aucun asset et n'avait aucune règle de repli, donc Angular ne se chargeait
 * jamais. Ce test sert la sortie de `npm run build` exactement comme Cloudflare Pages
 * (asset d'abord, puis `_redirects`) et vérifie que toutes les routes répondent.
 *
 * Ces tests visent une seule cible fonctionnelle (le repli d'hébergement) : ils
 * tournent uniquement sur le projet `chromium`.
 */

const DIST = join(__dirname, '..', 'dist', 'frontend', 'browser');
let server: CfPagesServer;

test.describe('Repli SPA Cloudflare Pages (build de production)', () => {
  // Une seule cible fonctionnelle (le repli d'hébergement) : on ne rejoue pas sur le
  // projet `mobile` (même moteur Chromium, viewport différent — sans intérêt ici).
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'repli d’hébergement — projet chromium uniquement');
  });

  test.beforeAll(async ({}, workerInfo) => {
    if (workerInfo.project.name !== 'chromium') return;
    if (!existsSync(join(DIST, 'index.csr.html'))) {
      // Le test a besoin de la sortie de build ; on la produit si elle manque.
      execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'inherit', timeout: 240_000 });
    }
    server = await startCfPagesServer(DIST);
  });

  test.afterAll(async () => {
    await server?.close();
  });

  test('le build produit `_redirects` avec le repli vers `index.csr.html`', () => {
    expect(existsSync(join(DIST, 'index.csr.html'))).toBe(true);
    const redirects = readFileSync(join(DIST, '_redirects'), 'utf8');
    expect(redirects).toMatch(/^\/\*\s+\/index\.csr\.html\s+200\s*$/m);
  });

  test('les 6 routes publiques sont prérendues et servies en 200', async ({ request }) => {
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
      expect(html, `${path} doit être le HTML prérendu`).toMatch(title);
      // contenu réellement prérendu (pas la coquille cliente vide)
      expect(html).not.toContain('<app-root></app-root>');
    }
    // le contenu métier prérendu est bien dans le HTML initial
    expect(await (await request.get(server.url + '/pricing')).text()).toContain(
      'Trois offres. PRO pour la plupart',
    );
  });

  test('`/login` répond 200 et affiche le LoginComponent', async ({ page }) => {
    const res = await page.goto(server.url + '/login');
    expect(res?.status()).toBe(200);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByLabel("Nom d'utilisateur")).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('`/admin` répond 200 puis le guard renvoie vers `/login`', async ({ page }) => {
    const res = await page.goto(server.url + '/admin');
    expect(res?.status()).toBe(200);
    // authGuard : non authentifié (build de prod, pas d'auto-login) → /login
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  });

  test('`/admin/restaurants/42` (route profonde) répond 200 et charge l’app', async ({ page }) => {
    const res = await page.goto(server.url + '/admin/restaurants/42');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('une URL inconnue est servie par la coquille et renvoyée vers l’accueil', async ({
    page,
  }) => {
    const res = await page.goto(server.url + '/cette-route-nexiste-pas');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(server.url + '/');
    await expect(page.getByRole('button', { name: 'Ouvrir le menu' }).or(
      page.getByRole('navigation', { name: 'Navigation principale', exact: true }),
    )).toBeVisible();
  });

  test('les assets statiques restent servis directement (pas la coquille)', async ({ request }) => {
    const robots = await request.get(server.url + '/robots.txt');
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).not.toContain('<app-root');

    const css = await request.get(server.url + '/styles-' + cssHash() + '.css');
    expect(css.status()).toBe(200);
    expect(css.headers()['content-type']).toContain('text/css');
  });
});

/** Récupère le nom hashé du bundle CSS depuis l'index prérendu. */
function cssHash(): string {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const m = html.match(/styles-([A-Z0-9]+)\.css/i);
  if (!m) throw new Error('bundle CSS introuvable dans index.html');
  return m[1];
}
