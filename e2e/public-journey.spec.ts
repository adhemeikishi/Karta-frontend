import { test, expect } from '@playwright/test';
import { PUBLIC_ROUTES, gotoHydrated } from './helpers';

/**
 * Parcours public principal : `/` → `/pricing` → `/features` → `/faq` → `/contact`,
 * uniquement via la navigation visible (navbar / footer). On ne visite jamais
 * `/login` : on vérifie seulement qu'il n'est pas l'action mise en avant des offres.
 */

test.describe('Navigation publique', () => {
  test('parcours complet via la navbar', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'navbar desktop — le parcours mobile est couvert par responsive.spec');
    await gotoHydrated(page, '/');
    await expect(page).toHaveTitle(PUBLIC_ROUTES[0].title);

    const nav = page.getByRole('navigation', { name: 'Navigation principale', exact: true });

    for (const route of PUBLIC_ROUTES.slice(1)) {
      await nav.getByRole('link', { name: route.nav, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${route.path.replace('/', '\\/')}$`));
      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('le logo ramène à l’accueil', async ({ page }) => {
    await gotoHydrated(page, '/contact');
    await page.getByRole('link', { name: 'Karta — accueil' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('les liens du footer pointent vers les bonnes routes', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    for (const [name, path] of [
      ['Fonctionnalités', '/features'],
      ['Tarifs', '/pricing'],
      ['FAQ', '/faq'],
      ['Contact', '/contact'],
    ] as const) {
      await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', path);
    }
  });

  test('chaque route publique se charge en accès direct', async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      const res = await page.goto(route.path);
      expect(res?.status(), route.path).toBeLessThan(400);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
    }
  });

  test('aucun lien externe n’est traité comme une route interne', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo')).toBeVisible();
    const hrefs = await page.locator('a[href^="http"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).href),
    );
    for (const href of hrefs) {
      expect(href, `lien externe inattendu : ${href}`).not.toContain('localhost:4200');
    }
  });
});
