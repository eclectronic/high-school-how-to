import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from '../session/session.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionStore = inject(SessionStore);
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
      if (error.status === 401) {
        sessionStore.clearSession();
      }
      return throwError(() => error);
    })
  );
};
