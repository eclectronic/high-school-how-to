import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../session/session.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const sessionStore = inject(SessionStore);
  if (sessionStore.isAuthenticated()) {
    return true;
  }
  const router = inject(Router);
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
