import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


export interface SupportTicket {
  id: number | string;
  created_at: string;
  user_name: string;
  title?: string;
  description: string;
  priority: string;
  status: string;
  assigned_to?: number | string | null;
  location?: string;
  category_id?: number;
  category_name?: string;
  level1_diagnostic?: unknown;
  user?: {
    id?: number | string;
    name?: string;
    email?: string;
  };
}

export interface CreateSupportTicketPayload {
  user_name: string;
  title: string;
  location: string;
  category_id: number;
  description: string;
  priority?: string;
  status?: string;
}

export interface UpdateTicketPayload {
  priority: string;
  status: string;
  description?: string;
}

export interface TicketResolutionPayload {
  cause: string;
  solution: string;
}

export interface TicketMutationResponse {
  success?: boolean;
  message?: string;
  data?: SupportTicket;
}

export interface TicketResolutionResponse {
  success?: boolean;
  message?: string;
  data?: Partial<SupportTicket>;
}

export interface TicketHistoryItem {
  id?: number | string;
  fecha: string;
  descripcion: string;
  detalles: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  details?: string;
  resolution?: string;
}

export interface PaginatedPayload<T> {
  data?: T[];
  items?: T[];
}

export interface ApiCollectionResponse<T> {
  success?: boolean;
  message?: string;
  data?: T[] | PaginatedPayload<T>;
  tickets?: T[];
  history?: T[];
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly http = inject(HttpClient);

  // URL base del microservicio de Tickets: http://127.0.0.1:8001/api
  private readonly apiUrl = environment.ticketApiUrl || 'http://127.0.0.1:8001/api';

  /**
   * Obtiene el listado de tickets abiertos para el panel de Soporte TI.
   * Consume: GET http://127.0.0.1:8001/api/tickets
   */
  getOpenTickets(): Observable<ApiCollectionResponse<SupportTicket> | SupportTicket[]> {
    return this.http.get<ApiCollectionResponse<SupportTicket> | SupportTicket[]>(
      `${this.apiUrl}/tickets`
    );
  }

  /**
   * Obtiene el historial completo de tickets atendidos/cerrados.
   * Consume: GET http://127.0.0.1:8001/api/tickets/history
   */
  getTicketHistory(filters: {
    mine?: boolean;
    assigned_to?: number | string;
    status?: string;
  } = {}): Observable<ApiCollectionResponse<TicketHistoryItem> | TicketHistoryItem[]> {
    let params = new HttpParams().set('status', filters.status ?? 'RESUELTO,CERRADO');

    if (filters.mine) {
      params = params.set('mine', '1');
    }

    if (filters.assigned_to !== undefined && filters.assigned_to !== null && filters.assigned_to !== '') {
      params = params.set('assigned_to', String(filters.assigned_to));
    }

    return this.http.get<ApiCollectionResponse<TicketHistoryItem> | TicketHistoryItem[]>(
      `${this.apiUrl}/tickets`,
      { params }
    );
  }

  /**
   * Crea un nuevo ticket en ticket-service (puerto 8001).
   * Consume: POST http://127.0.0.1:8001/api/tickets
   */
  createTicket(
    payload: CreateSupportTicketPayload | Record<string, unknown>
  ): Observable<TicketMutationResponse> {
    return this.http.post<TicketMutationResponse>(`${this.apiUrl}/tickets`, payload);
  }

  /**
   * Actualiza estado, prioridad o descripción de un ticket existente.
   * Consume: PUT http://127.0.0.1:8001/api/tickets/:id
   */
  updateTicket(
    id: number | string,
    payload: UpdateTicketPayload
  ): Observable<TicketMutationResponse> {
    return this.http.put<TicketMutationResponse>(`${this.apiUrl}/tickets/${id}`, payload);
  }

  /**
   * Elimina un ticket del microservicio de soporte.
   * Consume: DELETE http://127.0.0.1:8001/api/tickets/:id
   */
  deleteTicket(id: number | string): Observable<TicketMutationResponse> {
    return this.http.delete<TicketMutationResponse>(`${this.apiUrl}/tickets/${id}`);
  }

  /**
   * Asigna el ticket al usuario autenticado.
   * Consume: POST http://127.0.0.1:8001/api/tickets/:id/assign
   */
  assignTicket(id: number | string): Observable<TicketMutationResponse> {
    return this.http.post<TicketMutationResponse>(`${this.apiUrl}/tickets/${id}/assign`, null);
  }

  /**
   * Guarda la causa y solución y marca el ticket como resuelto.
   * Consume: PATCH http://127.0.0.1:8001/api/tickets/:id/resolution
   */
  resolveTicket(
    id: number | string,
    payload: TicketResolutionPayload
  ): Observable<TicketResolutionResponse> {
    return this.http.patch<TicketResolutionResponse>(
      `${this.apiUrl}/tickets/${id}/resolution`,
      payload
    );
  }
}
