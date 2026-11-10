import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CategorySelectionComponent } from './category-selection.component';
import { CategoryService } from '../../services/category.service';

describe('CategorySelectionComponent', () => {
  let component: CategorySelectionComponent;
  let fixture: ComponentFixture<CategorySelectionComponent>;
  let httpMock: HttpTestingController;
  let categoryService: CategoryService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [CategorySelectionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimations()
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    categoryService = TestBed.inject(CategoryService);
    fixture = TestBed.createComponent(CategorySelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Resolver la petición inicial de categorías en ngOnInit
    const initReq = httpMock.expectOne('http://127.0.0.1:8001/api/categories');
    initReq.flush({
      success: true,
      data: [
        { id: 1, name: 'Falla de Conectividad' },
        { id: 2, name: 'Soporte de Aplicaciones' }
      ]
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create and load categories', () => {
    expect(component).toBeTruthy();
    expect(component.categories().length).toBe(2);
    expect(component.isLoadingCategories()).toBe(false);
  });

  it('should submit ticket payload including level1_diagnostic when present in service', () => {
    categoryService.setLevel1Diagnostic({ summary: 'Reinicio de adaptador sin éxito' });

    component.ticketForm.setValue({
      location: 'Sede Principal - Sala de Sistemas',
      category_id: 1,
      description: 'Sin acceso a la red interna desde esta mañana.'
    });

    component.onSubmit();

    const postReq = httpMock.expectOne('http://127.0.0.1:8001/api/tickets');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      location: 'Sede Principal - Sala de Sistemas',
      category_id: 1,
      description: 'Sin acceso a la red interna desde esta mañana.',
      level1_diagnostic: { summary: 'Reinicio de adaptador sin éxito' }
    });

    postReq.flush({ success: true, message: 'Ticket creado exitosamente' });
  });
});
