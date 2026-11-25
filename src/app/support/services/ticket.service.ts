import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SupportTicket {
  id: number | string;
  created_at: string;
  user_name: string;
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
  getTicketHistory(): Observable<ApiCollectionResponse<TicketHistoryItem> | TicketHistoryItem[]> {
    return this.http.get<ApiCollectionResponse<TicketHistoryItem> | TicketHistoryItem[]>(
      `${this.apiUrl}/tickets/history`
    );
  }

  /**
   * Actualiza el estado y/o prioridad de un ticket existente.
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
