import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
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
      router.navigate(['/login']);
      return false;
    })
  );
};
