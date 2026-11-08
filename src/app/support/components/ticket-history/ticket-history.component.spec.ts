import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TicketHistoryComponent } from './ticket-history.component';

describe('TicketHistoryComponent', () => {
  let component: TicketHistoryComponent;
  let fixture: ComponentFixture<TicketHistoryComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketHistoryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimations()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('http://127.0.0.1:8001/api/tickets/history');
    req.flush([
      {
        id: 10,
        fecha: '2026-11-06T14:00:00Z',
        descripcion: 'Configuración de VPN institucional',
        detalles: 'Perfil de seguridad aplicado correctamente',
        status: 'Completado'
      }
    ]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load ticket history', () => {
    expect(component).toBeTruthy();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.getStatusClass('Completado')).toBe('chip--green');
  });
});

