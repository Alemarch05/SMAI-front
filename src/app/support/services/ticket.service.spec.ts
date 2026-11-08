import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SupportTicket, TicketHistoryItem, TicketService } from './ticket.service';

describe('TicketService', () => {
  let service: TicketService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(TicketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should consume GET http://127.0.0.1:8001/api/tickets in getOpenTickets()', () => {
    const mockTickets: SupportTicket[] = [
      {
        id: 101,
        created_at: '2026-11-07T10:30:00Z',
        user_name: 'Carlos Ramírez',
        description: 'Error de acceso a VPN corporativa',
        priority: 'Alta Prioridad',
        status: 'Pendiente'
      }
    ];

    service.getOpenTickets().subscribe((res) => {
      expect(res).toEqual(mockTickets);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8001/api/tickets');
    expect(req.request.method).toBe('GET');
    req.flush(mockTickets);
  });

  it('should consume GET http://127.0.0.1:8001/api/tickets/history in getTicketHistory()', () => {
    const mockHistory: TicketHistoryItem[] = [
      {
        id: 88,
        fecha: '2026-11-05T15:20:00Z',
        descripcion: 'Actualización de credenciales de correo',
        detalles: 'Restablecimiento completado por Nivel 1',
        status: 'Resuelto'
      }
    ];

    service.getTicketHistory().subscribe((res) => {
      expect(res).toEqual(mockHistory);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8001/api/tickets/history');
    expect(req.request.method).toBe('GET');
    req.flush(mockHistory);
  });
});

