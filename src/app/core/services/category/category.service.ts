import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CategoriesResponse } from '../../interfaces/category/category.interface';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);

  // URL base del microservicio de Tickets
  private apiUrl = environment.ticketApiUrl;

  /**
   * Obtiene las categorías (ubicaciones e incidencias) desde el microservicio de tickets.
   * GET http://127.0.0.1:8001/api/categories
   */
  getCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${this.apiUrl}/categories`);
  }
}
