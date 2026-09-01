export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  // Identifiants de DEV uniquement (correspondent au défaut du profil "dev" du
  // backend, voir application-dev.yml). Permet de sauter l'écran de login en
  // local puisque toi seul y as accès. Ce fichier n'existe QUE pour le build
  // de dev - environment.prod.ts n'a pas ce champ, donc rien de ceci ne part
  // jamais en production (voir angular.json, fileReplacements).
  devAutoLogin: {
    username: 'admin',
    password: 'dev-only-changeme',
  },
};
