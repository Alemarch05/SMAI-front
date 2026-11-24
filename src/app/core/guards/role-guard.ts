import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: unknown = route.data['roles'];
  const userRole = authService.getUserRole();

  if (
    typeof userRole === 'string' &&
    Array.isArray(allowedRoles) &&
    allowedRoles.every((role: unknown) => typeof role === 'string') &&
    allowedRoles.includes(userRole)
  ) {
    return true;
  }

  return router.createUrlTree(['/customer/support']);
};
