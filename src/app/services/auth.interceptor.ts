import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const authHeader = authService.getAuthorizationHeader();
  const authorizedReq = authHeader ? req.clone({ setHeaders: { Authorization: authHeader } }) : req;

  return next(authorizedReq).pipe(
    catchError((error) => {
      if (error?.status === 401) {
        // Session invalide : même purge que le bouton « Se déconnecter ».
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
