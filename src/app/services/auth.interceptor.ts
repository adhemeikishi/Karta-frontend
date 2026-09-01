import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authHeader = authService.getAuthorizationHeader();
  const authorizedReq = authHeader ? req.clone({ setHeaders: { Authorization: authHeader } }) : req;

  return next(authorizedReq).pipe(
    catchError((error) => {
      if (error?.status === 401) {
        authService.clearCredentials();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
