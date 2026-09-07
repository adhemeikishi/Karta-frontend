import { test, expect } from '@playwright/test';
import { gotoHydrated } from './helpers';

/**
 * `/faq` — accordéon `<details>/<summary>` natif. On ouvre réellement plusieurs
 * questions, on vérifie que la réponse apparaît, puis se referme.
 */

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/faq');
});

test('ouvre et referme une question', async ({ page }) => {
  const item = page
    .locator('details')
    .filter({ hasText: 'Dois-je réimprimer le QR quand je change ma carte ?' });
  const answer = item.getByText(/Vous le collez une fois sur vos tables/);

  await expect(answer).toBeHidden();

  await item.locator('summary').click();
  await expect(answer).toBeVisible();
  await expect(item).toHaveJSProperty('open', true);

  await item.locator('summary').click();
  await expect(answer).toBeHidden();
  await expect(item).toHaveJSProperty('open', false);
});

test('plusieurs questions peuvent être ouvertes indépendamment', async ({ page }) => {
  await expect(page.locator('details summary').first()).toBeVisible();
  expect(await page.locator('details summary').count()).toBeGreaterThanOrEqual(5);

  const q1 = page.locator('details').filter({ hasText: "Qu'est-ce que Karta ?" });
  const q2 = page.locator('details').filter({ hasText: 'Le QR pointe vers quoi ?' });

  await q1.locator('summary').click();
  await q2.locator('summary').click();

  await expect(q1).toHaveJSProperty('open', true);
  await expect(q2).toHaveJSProperty('open', true);
  await expect(page.locator('details[open]')).toHaveCount(2);
});

test('les ancres de catégories défilent vers la bonne section (sans quitter /faq)', async ({
  page,
}) => {
  await page
    .getByRole('navigation', { name: 'Catégories' })
    .getByRole('link', { name: 'Tarifs', exact: true })
    .click();
  // le helper scrollToAnchor défile sans changer d'URL ni de route
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.locator('#tarifs')).toBeInViewport();
});
