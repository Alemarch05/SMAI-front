import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ticketApiUrl || 'http://127.0.0.1:8001/api'}/tickets`;

  createTicket(payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post(this.apiUrl, payload);
  }
}
