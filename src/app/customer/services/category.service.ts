import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Category {
  id: number;
  name: string;
  description?: string;
  location_id?: number;
}

export interface LocationOption {
  id?: number;
  name: string;
}

export interface CategoriesNestedData {
  categories?: Category[];
  incidences?: Category[];
  locations?: (LocationOption | string)[];
}

export interface CategoriesApiResponse {
  success?: boolean;
  message?: string;
  data?: Category[] | CategoriesNestedData;
  categories?: Category[];
}

export interface CreateTicketPayload {
  location: string;
  category_id: number;
  description: string;
  level1_diagnostic?: unknown;
}

export interface CreateTicketResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: number | string;
    ticket_number?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private static readonly DIAGNOSTIC_STORAGE_KEY = 'level1_diagnostic';

  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  // URL base del microservicio de Tickets: http://127.0.0.1:8001/api
  private readonly apiUrl = environment.ticketApiUrl || 'http://127.0.0.1:8001/api';

  // Estado reactivo para almacenar el diagnóstico de Nivel 1 si proviene de un flujo previo
  private readonly _level1Diagnostic = signal<unknown>(null);
  readonly level1Diagnostic = this._level1Diagnostic.asReadonly();

  /**
   * Obtiene el catálogo de categorías de incidencia disponibles.
   * Consume: GET http://127.0.0.1:8001/api/categories
   */
  getCategories(): Observable<CategoriesApiResponse | Category[]> {
    return this.http.get<CategoriesApiResponse | Category[]>(`${this.apiUrl}/categories`);
  }

  /**
   * Registra un nuevo ticket de soporte para el cliente.
   * Consume: POST http://127.0.0.1:8001/api/tickets
   */
  createTicket(payload: CreateTicketPayload | Record<string, any>): Observable<CreateTicketResponse> {
    return this.http.post<CreateTicketResponse>(`${this.apiUrl}/tickets`, payload);
  }

  /**
   * Guarda el diagnóstico de Nivel 1 en el estado del servicio y en almacenamiento local.
   */
  setLevel1Diagnostic(diagnostic: unknown): void {
    this._level1Diagnostic.set(diagnostic);

    if (isPlatformBrowser(this.platformId)) {
      if (diagnostic !== null && diagnostic !== undefined && diagnostic !== '') {
        const serialized =
          typeof diagnostic === 'string' ? diagnostic : JSON.stringify(diagnostic);
        localStorage.setItem(CategoryService.DIAGNOSTIC_STORAGE_KEY, serialized);
      } else {
        localStorage.removeItem(CategoryService.DIAGNOSTIC_STORAGE_KEY);
      }
    }
  }

  /**
   * Recupera el diagnóstico de Nivel 1 desde memoria o desde localStorage si existe.
   */
  getLevel1Diagnostic(): unknown {
    const inMemory = this._level1Diagnostic();
    if (inMemory !== null && inMemory !== undefined && inMemory !== '') {
      return inMemory;
    }

    if (isPlatformBrowser(this.platformId)) {
      const rawStored = localStorage.getItem(CategoryService.DIAGNOSTIC_STORAGE_KEY);
      if (rawStored) {
        try {
          return JSON.parse(rawStored);
        } catch {
          return rawStored;
        }
      }
    }

    return null;
  }

  /**
   * Limpia el diagnóstico temporal una vez creado el ticket exitosamente.
   */
  clearLevel1Diagnostic(): void {
    this._level1Diagnostic.set(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(CategoryService.DIAGNOSTIC_STORAGE_KEY);
    }
  }
}

