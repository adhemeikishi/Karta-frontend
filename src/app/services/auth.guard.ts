import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Pas encore connecté : tente l'auto-connexion dev (no-op et renvoie false
  // immédiatement en production - voir AuthService.tryDevAutoLogin).
  return authService.tryDevAutoLogin().pipe(
    map((success) => {
      if (success) {
        return true;
      }
      // L'URL demandée est transmise à l'écran de connexion pour l'y ramener ensuite :
      // c'est le seul moyen, sans notion de session côté backend, qu'un restaurateur
      // arrivé sur /app/... n'atterrisse pas dans le back-office après s'être connecté.
      // La valeur est revalidée par LoginComponent (voir safeNextUrl).
      router.navigate(['/login'], { queryParams: { next: state.url } });
      return false;
    })
  );
};
