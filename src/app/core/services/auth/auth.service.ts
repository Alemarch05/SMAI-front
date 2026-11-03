import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {LoginResponse, LoginCredentials} from "../../interfaces/auth/auth.interface";

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  // Inyecciones de dependencias usando inject() (estándar moderno Standalone) a esto se le llama "Dependency Injection"
  // (DI) en Angular basicamente consiste en que se le injecta los metodo de una clase esto lo haremos para aclarar
  // si sera post, get, etc.
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // Variable que almacena la api base url del microservicio de autenticación en caso de ser del microservicio
  //  de tickets se cambiara a ticketApiUrl
  private apiUrl = environment.userApiUrl;

  // Estado reactivo de la sesión
  private authState = new BehaviorSubject<boolean>(false);
  authState$ = this.authState.asObservable();

  constructor() {
    // Validar si existe token solo si estamos ejecutando en el navegador
    if (isPlatformBrowser(this.platformId)) {
      this.authState.next(this.hasToken()); // el constructor se ejecuta al instanciar la clase y en este caso
      //  se valida si existe un token en el localStorage y se actualiza el estado de autenticación
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response: LoginResponse) => {
        if (isPlatformBrowser(this.platformId)) {
          // Guardar el token en el almacenamiento local
          localStorage.setItem('access_token', response.access_token);
          
          if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        }
        // Notificar a toda la app que el usuario está autenticado
        this.authState.next(true);
      })
    );
  }


  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    this.authState.next(false);
    this.router.navigate(['/login']);
  }
}