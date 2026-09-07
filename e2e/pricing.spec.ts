import { test, expect } from '@playwright/test';
import { gotoHydrated } from './helpers';

/**
 * `/pricing` — 3 offres réelles (BASIC / PRO / PREMIUM), prix affichés, CTA des
 * offres vers `/contact`, comparaison lisible. Aucun tunnel de paiement / création
 * de compte : le choix d'offre passe par le contact (périmètre V1).
 */

const OFFERS = [
  { id: 'BASIC', monthly: '29,99', cta: 'Commencer' },
  { id: 'PRO', monthly: '59,99', cta: 'Passer à Pro' },
  { id: 'PREMIUM', monthly: '99,99', cta: 'Créer mon menu' },
] as const;

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/pricing');
});

test('affiche les 3 offres avec leur prix mensuel', async ({ page }) => {
  const cards = page.locator('.pricing-card');
  await expect(cards).toHaveCount(3);

  for (const [i, offer] of OFFERS.entries()) {
    const card = cards.nth(i);
    await expect(card.getByText(offer.id, { exact: true })).toBeVisible();
    // Le compteur de prix s'anime de 0 → montant final : on attend la valeur finale.
    await expect(card).toContainText(`${offer.monthly} €`);
    await expect(card.getByText('/ mois')).toBeVisible();
  }
});

test('le CTA de chaque offre mène à /contact', async ({ page }) => {
  const cards = page.locator('.pricing-card');
  for (const [i, offer] of OFFERS.entries()) {
    const cta = cards.nth(i).getByRole('link', { name: new RegExp(offer.cta) });
    await expect(cta).toHaveAttribute('href', '/contact');
  }
});

test('le passage mensuel → annuel affiche le prix barré (−10 %)', async ({ page }) => {
  await expect(page.locator('.billing-discount-badge').first()).toHaveText('-10%');
  await page
    .getByRole('tablist', { name: 'Fréquence de facturation' })
    .getByRole('tab', { name: 'Annuel' })
    .click();
  const basic = page.locator('.pricing-card').first();
  await expect(basic).toContainText('359,99 €'); // yearlyOriginal, barré
  await expect(basic).toContainText('319,99 €'); // yearlyDiscounted
});

test('le tableau comparatif est lisible et sans défilement de page', async ({ page }) => {
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  for (const offer of OFFERS) {
    await expect(table.getByRole('columnheader', { name: offer.id })).toBeVisible();
  }
  await expect(table.getByRole('row', { name: /QR unique et permanent/ })).toBeVisible();
  // les cellules exposent l'information à l'assistive tech (pas seulement une icône)
  await expect(table.getByText('Inclus').first()).toBeAttached();
  await expect(table.getByText('Non inclus').first()).toBeAttached();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});

test('aucun tunnel de paiement ni création de compte public', async ({ page }) => {
  // pas de champ mot de passe / carte bancaire sur une page marketing
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  // toutes les actions d'offre pointent vers /contact, jamais vers /login ni un checkout
  const offerCtas = page.locator('.pricing-card a, .data-table a');
  await expect(offerCtas.first()).toBeVisible();
  const hrefs = await offerCtas.evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href')),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(href, `un CTA d'offre ne pointe pas vers /contact : ${href}`).toBe('/contact');
  }
});
