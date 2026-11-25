import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TicketListComponent } from './ticket-list.component';

describe('TicketListComponent', () => {
  let component: TicketListComponent;
  let fixture: ComponentFixture<TicketListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
    await TestBed.configureTestingModule({
      imports: [TicketListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('http://127.0.0.1:8001/api/tickets');
    req.flush([
      {
        id: 1,
        created_at: '2026-11-07T09:00:00Z',
        user_name: 'Ana Gómez',
        description: 'Fallo en impresora de red',
        priority: 'Alta Prioridad',
        status: 'En Proceso'
      },
      {
        id: 2,
        created_at: '2026-11-07T10:15:00Z',
        user_name: 'Luis Pérez',
        description: 'Instalación de certificado digital',
        priority: 'Media',
        status: 'Resuelto'
      }
    ]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('user');
  });

  it('should create and load open tickets', () => {
    expect(component).toBeTruthy();
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should assign expected badge classes by status and priority', () => {
    expect(component.getBadgeClass('Resuelto')).toBe('chip--green');
    expect(component.getBadgeClass('Completado')).toBe('chip--green');
    expect(component.getBadgeClass('Pendiente')).toBe('chip--amber');
    expect(component.getBadgeClass('En Proceso')).toBe('chip--amber');
    expect(component.getBadgeClass('Alta Prioridad')).toBe('chip--red');
  });

  it('should filter MatTableDataSource dynamically', () => {
    const fakeEvent = { target: { value: 'Ana' } } as unknown as Event;
    component.applyFilter(fakeEvent);
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].user_name).toBe('Ana Gómez');
  });

  it('should update ticket status and priority via PUT http://127.0.0.1:8001/api/tickets/:id', () => {
    component.selectedTicket.set(component.tickets()[0]);
    component.editTicketForm.setValue({
      priority: 'Crítica',
      status: 'Resuelto'
    });

    component.saveTicketChanges();

    const putReq = httpMock.expectOne('http://127.0.0.1:8001/api/tickets/1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      priority: 'Crítica',
      status: 'Resuelto'
    });
    putReq.flush({ success: true });

    expect(component.tickets()[0].status).toBe('Resuelto');
  });

  it('should delete ticket via DELETE http://127.0.0.1:8001/api/tickets/:id', () => {
    component.ticketToDelete.set(component.tickets()[0]);
    component.confirmDeleteTicket();

    const delReq = httpMock.expectOne('http://127.0.0.1:8001/api/tickets/1');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true });

    expect(component.tickets().length).toBe(1);
  });

  it('shows assignment instead of admin actions for support and updates the ticket after assignment', () => {
    fixture.destroy();
    localStorage.setItem('user', JSON.stringify({ role: 'soporte' }));
    fixture = TestBed.createComponent(TicketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne('http://127.0.0.1:8001/api/tickets').flush([
      {
        id: 1,
        created_at: '2026-11-07T09:00:00Z',
        user_name: 'Ana Gómez',
        description: 'Fallo en impresora de red',
        priority: 'Alta Prioridad',
        status: 'En Proceso'
      }
    ]);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.some((button) => button.textContent?.includes('Asignarme'))).toBe(true);
    expect(fixture.nativeElement.querySelector('.action-btn--edit')).toBeNull();
    expect(fixture.nativeElement.querySelector('.action-btn--delete')).toBeNull();

    component.assignTicket(component.tickets()[0]);
    const request = httpMock.expectOne('http://127.0.0.1:8001/api/tickets/1/assign');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      success: true,
      message: 'Ticket asignado al equipo de soporte y escalado',
      data: { id: 1, assigned_to: 5, status: 'ESCALADO' }
    });

    expect(component.tickets()[0].assigned_to).toBe(5);
    expect(component.tickets()[0].status).toBe('ESCALADO');
    expect(component.isTicketAssigned(component.tickets()[0])).toBe(true);

    component.openResolutionDialog(component.tickets()[0]);
    fixture.detectChanges();
    expect(document.body.textContent).toContain('Causa del problema');
    expect(component.resolutionForm.invalid).toBe(true);

    component.resolutionForm.setValue({
      cause: 'Fuente de alimentación defectuosa',
      solution: 'Se reemplazó la fuente y se verificó el encendido.'
    });
    component.submitResolution();

    const resolutionRequest = httpMock.expectOne(
      'http://127.0.0.1:8001/api/tickets/1/resolution'
    );
    expect(resolutionRequest.request.method).toBe('PATCH');
    expect(resolutionRequest.request.body).toEqual({
      cause: 'Fuente de alimentación defectuosa',
      solution: 'Se reemplazó la fuente y se verificó el encendido.'
    });
    resolutionRequest.flush({
      success: true,
      message: 'Ticket solucionado correctamente',
      data: { id: 1, status: 'RESUELTO' }
    });

    expect(component.tickets()[0].status).toBe('RESUELTO');
    expect(component.ticketToResolve()).toBeNull();
  });
});
