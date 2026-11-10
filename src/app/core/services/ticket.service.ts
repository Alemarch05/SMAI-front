import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8001/api/tickets';

  createTicket(payload: any): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }
}