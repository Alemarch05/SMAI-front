import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth/auth.service';

/**
 * Interceptor funcional (Angular 19+) que inyecta el encabezado `Authorization: Bearer <token>`
 * en todas las peticiones HTTP dirigidas a los microservicios (puerto 8000 Usuarios y puerto 8001 Tickets).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  let token = authService.getToken();

  if (!token && isPlatformBrowser(platformId)) {
    token = localStorage.getItem('access_token') ?? localStorage.getItem('token');
  }

  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    return next(clonedReq);
  }

  return next(req);
};

export const authInterceptorInterceptor = authInterceptor;
