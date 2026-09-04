export const environment = {
  production: true,
  // Frontend (Cloudflare, https://kartaqr.fr) et backend (VPS, https://api.kartaqr.fr)
  // sont sur des domaines distincts : URL absolue obligatoire. L'origine du frontend
  // doit être déclarée dans cors.allowed-origins côté backend (voir application-prod.yml).
  apiBaseUrl: 'https://api.kartaqr.fr',
  // Jamais peuplé en prod - l'auto-login dev n'existe que dans environment.ts.
  devAutoLogin: undefined as { username: string; password: string } | undefined,
};
