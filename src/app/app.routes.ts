import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component/login.component';
import { authGuard } from './core/guards/auth-guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas por authGuard con el MainLayout
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Aquí se irán cargando los módulos de Categorías y Diagnóstico
      { path: '', redirectTo: 'categories', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
