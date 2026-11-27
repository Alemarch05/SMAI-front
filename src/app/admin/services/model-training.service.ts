import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ModelTrainingResponse {
  status: string;
  model_version: string;
  indexed_cases: number;
  skipped_without_category: number;
  skipped_noisy: number;
  categories_covered: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ModelTrainingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.aiTrainingApiUrl || 'http://127.0.0.1:8002';

  trainModel(): Observable<ModelTrainingResponse> {
    return this.http.post<ModelTrainingResponse>(`${this.apiUrl}/train`, null);
  }
}
