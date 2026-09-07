import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — tests E2E du site public Karta (`/`, `/pricing`, `/features`,
 * `/faq`, `/contact`). Les tests unitaires Karma/Jasmine (`npm test`) restent
 * l'outil de test des composants ; Playwright ne couvre que les parcours bout en bout.
 *
 * Environnement volontairement minimal : un seul serveur (`npm start`, réutilisé
 * s'il tourne déjà), Chromium desktop + un projet mobile ~390 px.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Mobile ~390 px — vérifie l'absence de débordement horizontal et le menu mobile.
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
