import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TicketListComponent } from './ticket-list.component';

describe('TicketListComponent', () => {
  let component: TicketListComponent;
  let fixture: ComponentFixture<TicketListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimations()]
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
});

