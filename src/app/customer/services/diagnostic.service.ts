import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface DiagnosticResponse {
  success: boolean;
  data: any; 
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticService {
  private http = inject(HttpClient);
  private apiUrl = environment.ticketApiUrl; 

  getDiagnosticTree(categoryId: string): Observable<DiagnosticResponse> {
    return this.http.get<DiagnosticResponse>(`${this.apiUrl}/categories/${categoryId}/diagnostic-tree`);
  }
}