import { test, expect } from '@playwright/test';
import { gotoHydrated } from './helpers';

/**
 * `/contact` — formulaire de prise de contact. Le backend `POST /api/contact`
 * n'existe pas encore : on ne teste QUE le comportement frontend réellement
 * implémenté (validation, états). Les cas succès/erreur réseau sont vérifiés en
 * interceptant la requête — jamais en prétendant qu'un email a été envoyé.
 */

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/contact');
});

test('les champs ont des libellés associés', async ({ page }) => {
  await expect(page.getByLabel('Nom')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel(/Restaurant/)).toBeVisible();
  await expect(page.getByLabel('Sujet')).toBeVisible();
  await expect(page.getByLabel('Message')).toBeVisible();
});

test('une soumission vide affiche les erreurs des champs requis', async ({ page }) => {
  await page.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByText('Votre nom est requis.')).toBeVisible();
  await expect(page.getByText('Indiquez un email valide.')).toBeVisible();
  await expect(page.getByText(/10 caractères minimum/)).toBeVisible();

  await expect(page.getByLabel('Nom')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Nom')).toHaveAttribute('aria-describedby', 'c-name-err');
});

test('un email invalide est signalé', async ({ page }) => {
  await page.getByLabel('Nom').fill('Camille');
  await page.getByLabel('Email').fill('pas-un-email');
  await page.getByLabel('Message').fill('Bonjour, je voudrais en savoir plus.');
  await page.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByText('Indiquez un email valide.')).toBeVisible();
  await expect(page.getByText('Votre nom est requis.')).toBeHidden();
});

test('un formulaire incomplet ne se soumet pas', async ({ page }) => {
  let called = false;
  await page.route('**/api/contact', (route) => {
    called = true;
    return route.fulfill({ status: 200, body: '{}' });
  });

  await page.getByLabel('Nom').fill('Camille');
  await page.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByText(/10 caractères minimum/)).toBeVisible();
  expect(called).toBe(false);
});

test('des valeurs valides déclenchent la soumission et l’état de succès', async ({ page }) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  await page.getByLabel('Nom').fill('Camille Roy');
  await page.getByLabel('Email').fill('camille@example.com');
  await page.getByLabel('Message').fill('Bonjour, je voudrais mettre en place Karta pour mon restaurant.');
  await page.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByText('Message envoyé.')).toBeVisible();
});

test('une erreur réseau affiche un message d’échec, pas un faux succès', async ({ page }) => {
  await page.route('**/api/contact', (route) => route.fulfill({ status: 500, body: '{}' }));

  await page.getByLabel('Nom').fill('Camille Roy');
  await page.getByLabel('Email').fill('camille@example.com');
  await page.getByLabel('Message').fill('Bonjour, je voudrais mettre en place Karta pour mon restaurant.');
  await page.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByRole('alert')).toContainText("L'envoi a échoué");
  await expect(page.getByText('Message envoyé.')).toBeHidden();
});

test('le formulaire ne demande jamais de mot de passe', async ({ page }) => {
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
