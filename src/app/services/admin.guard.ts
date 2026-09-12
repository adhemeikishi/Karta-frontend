import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Le back-office est réservé à Karta.
 *
 * Un restaurateur n'a rien à y faire, et le backend le lui refuse déjà
 * (`RestaurateurScopeFilter` : ni tableau de bord, ni liste des clients). Ce guard évite
 * qu'il tombe sur un écran de back-office rempli d'erreurs 403 : il est renvoyé vers son
 * espace. La protection réelle reste côté serveur — celle-ci n'est qu'un confort d'UX.
 *
 * Se place APRÈS `authGuard`, qui garantit qu'on est connecté. Une identité inconnue
 * (session héritée d'une version antérieure) repasse par la connexion plutôt que
 * d'ouvrir le back-office sur un doute.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const identity = auth.identity();
  if (identity?.role === 'ADMIN') {
    return true;
  }
  if (identity?.role === 'RESTAURATEUR') {
    return router.createUrlTree(['/app']);
  }
  return router.createUrlTree(['/login']);
};
