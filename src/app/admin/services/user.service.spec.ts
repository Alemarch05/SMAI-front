import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUser, CreateUserPayload, UpdateUserPayload, UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users via GET http://127.0.0.1:8000/api/users', () => {
    const mockUsers: AdminUser[] = [
      { id: 1, name: 'Admin SMAI', email: 'admin@smai.com', role: 'Administrador' }
    ];

    service.getUsers().subscribe((res) => {
      expect(res).toEqual(mockUsers);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should create user via POST http://127.0.0.1:8000/api/users', () => {
    const payload: CreateUserPayload = {
      name: 'Nuevo Soporte',
      email: 'soporte@smai.com',
      role: 'support',
      password: 'password123'
    };

    service.createUser(payload).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true });
  });

  it('should update user via PUT http://127.0.0.1:8000/api/users/:id', () => {
    const payload: UpdateUserPayload = {
      name: 'Soporte Actualizado',
      email: 'soporte@smai.com',
      role: 'admin'
    };

    service.updateUser(5, payload).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/users/5');
    expect(req.request.method).toBe('PUT');
    req.flush({ success: true });
  });

  it('should delete user via DELETE http://127.0.0.1:8000/api/users/:id', () => {
    service.deleteUser(5).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/users/5');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });
});
