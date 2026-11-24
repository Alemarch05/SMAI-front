import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  let userRole: string | null;
  let router: Router;

  const executeGuard = (roles: unknown) => {
    const state = router.routerState.snapshot;
    const route = state.root;
    route.data = { roles };

    return TestBed.runInInjectionContext(() => roleGuard(route, state));
  };

  beforeEach(() => {
    userRole = 'admin';
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getUserRole: () => userRole } },
        provideRouter([])
      ]
    });
    router = TestBed.inject(Router);
  });

  it('allows support to access routes assigned to the support role', () => {
    userRole = 'soporte';

    expect(executeGuard(['admin', 'soporte'])).toBe(true);
  });

  it('redirects a user whose role is not allowed', () => {
    userRole = 'cliente';

    const result = executeGuard(['admin']);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/customer/support');
  });

  it('redirects when the route has no valid role configuration', () => {
    const result = executeGuard(undefined);

    expect(result).toBeInstanceOf(UrlTree);
  });
});
