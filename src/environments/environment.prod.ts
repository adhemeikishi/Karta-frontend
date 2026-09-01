export const environment = {
  production: true,
  // Le back-office est servi depuis le même domaine que l'API en production
  // (voir docs/DEPLOYMENT.md) - chemin relatif, pas d'URL en dur.
  apiBaseUrl: '',
  // Jamais peuplé en prod - l'auto-login dev n'existe que dans environment.ts.
  devAutoLogin: undefined as { username: string; password: string } | undefined,
};
