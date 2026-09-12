import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { RestaurantContextService } from '../restaurateur/restaurant-context.service';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from './onboarding.service';

/**
 * Tant que son restaurant n'est pas configuré, le restaurateur va au parcours de
 * configuration — pas sur un espace vide qu'il ne saurait pas remplir.
 *
 * La réponse vient du serveur (`onboardingCompletedAt`, posé à la première publication)
 * et non du navigateur : changer d'appareil ou vider son cache ne remet personne au
 * début, et personne ne peut sauter le parcours en écrivant dans son `localStorage`.
 *
 * Une erreur de chargement laisse passer : le châssis affiche déjà l'erreur proprement,
 * et bloquer l'accès sur une panne réseau serait pire que de l'afficher.
 */
export const onboardingGuard: CanActivateFn = (route) => {
  const context = inject(RestaurantContextService);
  const router = inject(Router);

  const restaurantId = route.paramMap.get('restaurantId');
  if (!restaurantId) {
    return true;
  }

  return context.ensure(restaurantId).pipe(
    map((restaurant) =>
      restaurant.onboardingCompletedAt ? true : router.createUrlTree(['/onboarding']),
    ),
    catchError(() => of(true)),
  );
};

/**
 * Entrée du parcours : `/onboarding` renvoie vers l'étape où le restaurateur en est.
 *
 * L'étape est déduite de l'état réel du serveur (voir {@link OnboardingService}) — un
 * restaurateur qui ferme son navigateur pendant la vérification de sa carte la retrouve
 * ouverte à la vérification, pas au début.
 *
 * Un restaurant déjà configuré n'a plus rien à faire ici : il repart vers son espace.
 */
export const onboardingEntryGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const onboarding = inject(OnboardingService);
  const router = inject(Router);

  const restaurantId = auth.identity()?.restaurantId;
  if (!restaurantId) {
    return router.createUrlTree(['/app']);
  }

  return onboarding.refresh(restaurantId).pipe(
    map(() => {
      const restaurant = onboarding.restaurant();
      if (restaurant?.onboardingCompletedAt) {
        return router.createUrlTree(['/app', restaurantId, 'carte']);
      }
      if (onboarding.error()) {
        // Le châssis affiche l'erreur et propose de réessayer : on n'invente pas d'étape.
        return router.createUrlTree(['/onboarding', 'welcome']);
      }
      return router.createUrlTree(['/onboarding', onboarding.step()]);
    }),
  );
};
