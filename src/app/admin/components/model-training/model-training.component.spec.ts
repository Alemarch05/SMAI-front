import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ModelTrainingComponent } from './model-training.component';

describe('ModelTrainingComponent', () => {
  let component: ModelTrainingComponent;
  let fixture: ComponentFixture<ModelTrainingComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelTrainingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ModelTrainingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the metrics and categories returned by a successful training run', () => {
    component.trainModel();

    const request = httpMock.expectOne('http://127.0.0.1:8002/train');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      status: 'success',
      model_version: 'cbr-hybrid-v2.1',
      indexed_cases: 4,
      skipped_without_category: 0,
      skipped_noisy: 0,
      categories_covered: [1, 2, 3]
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Entrenamiento completado');
    expect(fixture.nativeElement.textContent).toContain('4');
    expect(fixture.nativeElement.textContent).toContain('cbr-hybrid-v2.1');
    expect(fixture.nativeElement.textContent).toContain('Categoría 3');
    expect(component.isTraining()).toBe(false);
  });

  it('reports an API failure without showing a success result', () => {
    component.trainModel();
    const request = httpMock.expectOne('http://127.0.0.1:8002/train');
    request.flush(
      { message: 'Servicio temporalmente no disponible' },
      { status: 503, statusText: 'Service Unavailable' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Servicio temporalmente no disponible'
    );
    expect(component.trainingResult()).toBeNull();
    expect(component.isTraining()).toBe(false);
  });
});
