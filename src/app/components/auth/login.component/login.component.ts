import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../shared/material.module';
import { AuthService} from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { LoginCredentials } from '../../../core/interfaces/auth/auth.interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { inject } from '@angular/core';

@Component({
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  standalone: true,
  selector: 'app-login.component',
  styleUrl: './login.component.scss',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  // Inyecciones mediante inject()
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Formulario reactivo fuertemente tipado
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  hidePassword = true;

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    const credentials: LoginCredentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('¡Inicio de sesión exitoso!', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/categories']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        const errorMsg = err.status === 401 
          ? 'Credenciales incorrectas' 
          : 'Error al conectar con el servidor de autenticación';
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 4000 });
      }
    });
  }
}
