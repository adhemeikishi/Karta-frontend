import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Rendu par route pour le build statique (`outputMode: static`).
 *
 * Les 5 routes publiques (+ l'alias `/landing`) sont **prérendues** en HTML à la
 * compilation. Tout le reste — `/login`, `/admin/**`, URLs inconnues — est livré en
 * `Client` (coquille SPA hydratée dans le navigateur) : ces écrans sont privés,
 * dynamiques et derrière `authGuard`, ils n'ont rien à gagner d'un prérendu.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'landing', renderMode: RenderMode.Prerender },
  { path: 'pricing', renderMode: RenderMode.Prerender },
  { path: 'features', renderMode: RenderMode.Prerender },
  { path: 'faq', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
