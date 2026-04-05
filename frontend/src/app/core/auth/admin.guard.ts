import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../session/session.store';

export const adminGuard: CanActivateFn = (_route, _state) => {
  const sessionStore = inject(SessionStore);
  if (sessionStore.isAdmin()) {
    return true;
  }
  return inject(Router).createUrlTree(['/']);
};
