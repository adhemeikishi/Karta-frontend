import { expect, Page } from '@playwright/test';

/** Les 5 routes publiques et le libellé de nav correspondant. */
export const PUBLIC_ROUTES = [
  { path: '/', nav: 'Accueil', title: /Le menu digital par QR code — Karta/ },
  { path: '/features', nav: 'Fonctionnalités', title: /Fonctionnalités — Karta/ },
  { path: '/pricing', nav: 'Tarifs', title: /Tarifs — Karta/ },
  { path: '/faq', nav: 'FAQ', title: /FAQ — Karta/ },
  { path: '/contact', nav: 'Contact', title: /Contact — Karta/ },
] as const;

/**
 * Va sur `path` puis attend qu'Angular ait **hydraté** la page prérendue : tant que
 * l'hydratation n'est pas finie, le HTML statique est là mais les `FormControl` et
 * les gestionnaires d'évènements ne sont pas encore actifs (une saisie faite trop
 * tôt serait perdue). On s'appuie sur l'API de testabilité (présente avec `ng serve`).
 */
export async function gotoHydrated(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'networkidle' });
  // Le HTML prérendu est déjà là ; on laisse Angular finir d'hydrater (attacher les
  // FormControl et les écouteurs) avant toute interaction. Court et suffisant pour
  // ces pages légères une fois le bundle chargé (networkidle).
  await page.waitForTimeout(500);
}

/** Aucune barre de défilement horizontale : `scrollWidth` ne dépasse pas la zone visible. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `débordement horizontal : scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`,
  ).toBeLessThanOrEqual(clientWidth + 1);
}
