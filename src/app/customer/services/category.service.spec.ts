import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryService, CreateTicketPayload } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch categories via GET http://127.0.0.1:8001/api/categories', () => {
    const mockCategories = [{ id: 1, name: 'Conectividad y Redes' }];

    service.getCategories().subscribe((res) => {
      expect(res).toEqual(mockCategories);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8001/api/categories');
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
  });

  it('should create ticket via POST http://127.0.0.1:8001/api/tickets', () => {
    const payload: CreateTicketPayload = {
      location: 'Sede Principal - Sala de Sistemas',
      category_id: 1,
      description: 'No hay conexión a internet en el puesto 12',
      level1_diagnostic: 'Router sin respuesta ICMP'
    };

    service.createTicket(payload).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8001/api/tickets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, message: 'Ticket creado' });
  });
});

