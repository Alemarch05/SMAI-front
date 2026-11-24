import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    localStorage.removeItem('user');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns the role saved with the user', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));

    expect(service.getUserRole()).toBe('admin');
  });

  it('returns null when the saved user has no valid role', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Ana' }));

    expect(service.getUserRole()).toBeNull();
  });
});
