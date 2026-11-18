import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: number | string;
  name: string;
  email: string;
  role: string;
  status?: string;
  created_at?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  password?: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  role: string;
  password?: string;
}

export interface UsersApiResponse {
  success?: boolean;
  message?: string;
  data?: AdminUser[] | { data?: AdminUser[]; users?: AdminUser[] };
  users?: AdminUser[];
}

export interface UserMutationResponse {
  success?: boolean;
  message?: string;
  data?: AdminUser;
  user?: AdminUser;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);

  // URL base del microservicio de Usuarios: http://127.0.0.1:8000/api
  private readonly apiUrl = environment.userApiUrl || 'http://127.0.0.1:8000/api';

  /**
   * Obtiene el listado de usuarios registrados.
   * Consume: GET http://127.0.0.1:8000/api/users
   */
  getUsers(): Observable<UsersApiResponse | AdminUser[]> {
    return this.http.get<UsersApiResponse | AdminUser[]>(`${this.apiUrl}/users`);
  }

  /**
   * Crea un nuevo usuario en el sistema.
   * Consume: POST http://127.0.0.1:8000/api/users
   */
  createUser(payload: CreateUserPayload): Observable<UserMutationResponse> {
    return this.http.post<UserMutationResponse>(`${this.apiUrl}/users`, payload);
  }

  /**
   * Actualiza los datos de un usuario existente.
   * Consume: PUT http://127.0.0.1:8000/api/users/:id
   */
  updateUser(id: number | string, payload: UpdateUserPayload): Observable<UserMutationResponse> {
    return this.http.put<UserMutationResponse>(`${this.apiUrl}/users/${id}`, payload);
  }

  /**
   * Elimina un usuario por su identificador.
   * Consume: DELETE http://127.0.0.1:8000/api/users/:id
   */
  deleteUser(id: number | string): Observable<UserMutationResponse> {
    return this.http.delete<UserMutationResponse>(`${this.apiUrl}/users/${id}`);
  }
}
