import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { SessionStore } from '../session/session.store';

let refreshInFlight: Promise<unknown> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionStore = inject(SessionStore);
  const router = inject(Router);
  const authApi = inject(AuthApiService);
  const token = sessionStore.getAccessToken();
  const shouldAttach = token && req.url.startsWith('/api');
  const authReq = shouldAttach
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const currentUrl = router.url || '/';
      const onAuthRoute = currentUrl.startsWith('/auth');
      const isAuthRequest = req.url.startsWith('/api/auth');

      if (error.status === 401) {
        const refreshToken = sessionStore.getRefreshToken();
        const isRefreshRequest = req.url.startsWith('/api/auth/refresh');

        if (refreshToken && !isAuthRequest && !isRefreshRequest) {
          if (!refreshInFlight) {
            refreshInFlight = firstValueFrom(authApi.refresh({ refreshToken }))
              .then(response => {
                sessionStore.setSession(response);
              })
              .catch(refreshError => {
                sessionStore.clearSession();
                router.navigate(['/auth/login'], {
                  queryParams: { reason: 'expired', returnUrl: currentUrl }
                });
                throw refreshError;
              })
              .finally(() => {
                refreshInFlight = null;
              });
          }

          return from(refreshInFlight).pipe(
            switchMap(() => {
              const retryToken = sessionStore.getAccessToken();
              if (!retryToken) {
                return throwError(() => error);
              }
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${retryToken}` }
              });
              return next(retryReq);
            })
          );
        }

        sessionStore.clearSession();
        if (!onAuthRoute && !isAuthRequest) {
          router.navigate(['/auth/login'], {
            queryParams: { reason: 'expired', returnUrl: currentUrl }
          });
        }
      }
      return throwError(() => error);
    })
  );
};
