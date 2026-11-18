import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor-interceptor';
import { AuthService } from '../services/auth/auth.service';

describe('authInterceptor', () => {
  const executeInterceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getToken: () => 'mock-jwt-token-123'
          }
        }
      ]
    });
  });

  it('should be created', () => {
    expect(executeInterceptor).toBeTruthy();
  });

  it('should attach Authorization Bearer header to outgoing requests', () => {
    const req = new HttpRequest('GET', 'http://127.0.0.1:8000/api/users');
    let capturedAuthHeader: string | null = null;

    const next: HttpHandlerFn = (clonedReq) => {
      capturedAuthHeader = clonedReq.headers.get('Authorization');
      return of(new HttpResponse({ status: 200 }));
    };

    executeInterceptor(req, next).subscribe();
    expect(capturedAuthHeader).toBe('Bearer mock-jwt-token-123');
  });
});
