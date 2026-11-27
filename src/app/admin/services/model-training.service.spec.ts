import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ModelTrainingService } from './model-training.service';

describe('ModelTrainingService', () => {
  let service: ModelTrainingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(ModelTrainingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends an empty POST to the model training endpoint', () => {
    service.trainModel().subscribe((response) => {
      expect(response.status).toBe('success');
      expect(response.indexed_cases).toBe(4);
    });

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
  });
});
