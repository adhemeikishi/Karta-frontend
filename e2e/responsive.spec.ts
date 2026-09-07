import { test, expect } from '@playwright/test';
import { PUBLIC_ROUTES, expectNoHorizontalOverflow, gotoHydrated } from './helpers';

/**
 * Responsive : sur les deux projets (Chromium desktop et mobile ~390 px), chaque
 * page publique se charge, ne déborde pas horizontalement, et le contenu principal
 * reste visible. Le menu mobile est testé en conditions réelles.
 */

for (const route of PUBLIC_ROUTES) {
  test(`${route.path} — pas de débordement horizontal, contenu visible`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // après défilement en bas de page (images/reveal au scroll chargés)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await expectNoHorizontalOverflow(page);
  });
}

test('menu mobile : ouverture, navigation, fermeture', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'menu mobile : projet mobile uniquement');

  await gotoHydrated(page, '/');
  const toggle = page.getByRole('button', { name: 'Ouvrir le menu' });
  const panel = page.locator('#landing-mobile-menu');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toHaveCSS('opacity', '0');

  await toggle.click();
  await expect(page.getByRole('button', { name: 'Fermer le menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(panel).toHaveCSS('opacity', '1');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');

  // Échap referme
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toHaveCSS('opacity', '0');

  // rouvrir puis naviguer : le menu se referme après la navigation
  await toggle.click();
  await panel.getByRole('link', { name: 'Fonctionnalités', exact: true }).click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toHaveCSS('opacity', '0');
});

test('menu mobile : chaque lien mène à la bonne route', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'menu mobile : projet mobile uniquement');

  const targets = [
    ['Accueil', '/'],
    ['Fonctionnalités', '/features'],
    ['Tarifs', '/pricing'],
    ['FAQ', '/faq'],
    ['Contact', '/contact'],
  ] as const;

  const panel = page.locator('#landing-mobile-menu');
  for (const [name, path] of targets) {
    await gotoHydrated(page, '/faq');
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await expect(panel).toHaveCSS('opacity', '1');
    await panel.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(path === '/' ? /localhost:4200\/$/ : new RegExp(path + '$'));
  }
});
