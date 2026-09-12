import { test, expect, Page } from '@playwright/test';

/**
 * Régression : en naviguant depuis le bas d'une page publique vers une autre, on
 * arrivait en bas de la nouvelle page. Le Router n'avait aucune stratégie de
 * défilement (`scrollPositionRestoration` par défaut = `disabled`), donc le
 * navigateur conservait simplement la position.
 *
 * Ces tests couvrent les trois comportements attendus, dans le vrai navigateur :
 * nouvelle page → haut, précédent → position mémorisée, ancre → section visée.
 * Ils tournent sur les deux projets (desktop et ~390 px).
 */

/** Descend tout en bas et attend que la position soit réellement appliquée. */
async function scrollToBottom(page: Page): Promise<number> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => window.scrollY > 200, undefined, { timeout: 5000 });
  return page.evaluate(() => window.scrollY);
}

async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/** Clique un lien de la navbar. Le menu mobile doit être ouvert au préalable. */
async function navClick(page: Page, label: string): Promise<void> {
  const desktop = page.getByRole('navigation', { name: 'Navigation principale', exact: true });
  if (await desktop.isVisible().catch(() => false)) {
    await desktop.getByRole('link', { name: label, exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page
    .getByRole('navigation', { name: 'Navigation principale (mobile)' })
    .getByRole('link', { name: label, exact: true })
    .click();
}

test.describe('Défilement à la navigation (site public)', () => {
  test('une nouvelle page s’ouvre en haut, quelle que soit la position quittée', async ({
    page,
  }) => {
    // Les trois enchaînements signalés, à la suite : chaque page est quittée depuis
    // le bas, et la suivante doit s'ouvrir en haut.
    const journey: [string, RegExp][] = [
      ['Fonctionnalités', /\/features$/],
      ['Tarifs', /\/pricing$/],
      ['FAQ', /\/faq$/],
    ];

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    for (const [label, url] of journey) {
      const left = await scrollToBottom(page);
      expect(left, `on doit bien quitter la page depuis le bas (${label})`).toBeGreaterThan(200);

      await navClick(page, label);
      await expect(page).toHaveURL(url);
      await page.waitForTimeout(500);

      expect(await scrollY(page), `${url} doit s'ouvrir en haut`).toBeLessThanOrEqual(1);
    }
  });

  test('le bouton précédent restaure la position quittée', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const left = await scrollToBottom(page);

    await navClick(page, 'FAQ');
    await expect(page).toHaveURL(/\/faq$/);
    await page.waitForTimeout(500);
    expect(await scrollY(page)).toBeLessThanOrEqual(1);

    await page.goBack();
    await expect(page).toHaveURL(/\/pricing$/);
    await page.waitForTimeout(700);

    // On assère que la position est RESTAURÉE, pas qu'elle l'est au pixel près.
    // Angular restaure sur `NavigationEnd`, avant que la page ait fini de se
    // stabiliser : si les polices ne sont pas encore appliquées, la page est plus
    // courte et la position demandée est écrêtée à son maximum. L'écart est faible
    // sur desktop et peut être marqué sur mobile, où le texte se replie davantage.
    // Ce qui compte fonctionnellement — et ce qui est déterministe — est de ne pas
    // être revenu en haut.
    const restored = await scrollY(page);
    expect(restored, 'la position ne doit pas être remise à zéro').toBeGreaterThan(100);
    expect(restored, 'et ne doit pas dépasser la position quittée').toBeLessThanOrEqual(
      left + 5,
    );
  });

  test('un lien d’ancre défile toujours vers sa section, sans changer de page', async ({
    page,
  }) => {
    await page.goto('/faq', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Le sommaire de /faq pointe vers les groupes de la même page.
    await page.getByRole('navigation', { name: 'Catégories' }).getByRole('link').last().click();
    await page.waitForTimeout(900);

    await expect(page).toHaveURL(/\/faq$/);
    expect(await scrollY(page), 'le clic sur une ancre doit défiler').toBeGreaterThan(100);
  });
});
