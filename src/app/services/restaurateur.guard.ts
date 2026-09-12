import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * L'Espace Restaurateur est réservé aux restaurateurs.
 *
 * Un administrateur n'y a rien à faire : il gère tous les clients depuis le back-office,
 * où le même studio et la même Review sont montés. L'y laisser entrer donnerait un écran
 * qui parle de « votre carte » à quelqu'un qui n'en a pas.
 *
 * Se place APRÈS `authGuard`, qui garantit qu'on est connecté. Une identité inconnue
 * (session héritée d'une version antérieure du frontend) repasse par la connexion plutôt
 * que d'ouvrir un espace sur un doute.
 */
export const restaurateurGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const identity = auth.identity();
  if (identity?.role === 'RESTAURATEUR') {
    return true;
  }
  if (identity?.role === 'ADMIN') {
    return router.createUrlTree(['/admin/dashboard']);
  }
  return router.createUrlTree(['/login']);
};

/**
 * Un restaurateur n'ouvre que SON restaurant.
 *
 * L'identifiant présent dans l'URL n'est jamais une autorisation : il dit seulement ce
 * qui est demandé. La seule source qui fasse foi est l'identité renvoyée par
 * `GET /api/admin/me`. Changer l'UUID dans la barre d'adresse renvoie donc l'utilisateur
 * vers son propre restaurant — et, s'il insistait, le backend refuserait de toute façon
 * (`RestaurateurScopeFilter`). Cette garde n'est qu'un confort : elle évite un écran
 * entièrement couvert d'erreurs 403.
 *
 * Inclut {@link restaurateurGuard} : les deux vérifications portent sur la même route et
 * les séparer obligerait à les déclarer par paire partout, donc à pouvoir en oublier une.
 */
export const restaurantAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roleCheck = restaurateurGuard(route, state);
  if (roleCheck !== true) {
    return roleCheck;
  }

  const identity = auth.identity();
  const requested = route.paramMap.get('restaurantId');

  if (!identity?.restaurantId) {
    // Compte restaurateur sans restaurant : `/app` l'explique proprement.
    return router.createUrlTree(['/app']);
  }
  if (requested !== identity.restaurantId) {
    return router.createUrlTree(['/app', identity.restaurantId, 'carte']);
  }
  return true;
};
