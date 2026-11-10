import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component/login.component';
import { authGuard } from './core/guards/auth-guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
import { Enlace1Component } from './components/tests/enlace1.component/enlace1.component';
import { Enlace2Component } from './components/tests/enlace2.component/enlace2.component';
import { InteractiveDiagnosticComponent } from './customer/components/interactive-diagnostic/interactive-diagnostic.component';
import { CreateTicketComponent } from './customer/components/create-ticket/create-ticket.component';
import { DiagnosticMenuComponent } from './customer/components/diagnostic-menu/diagnostic-menu.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas por authGuard con el MainLayout
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Redirección por defecto si entran a la raíz '/' hacia '/enlace1'
      { path: '', redirectTo: 'enlace1', pathMatch: 'full' },
      
      // Aquí declaras la ruta para Enlace1Component
      { path: 'enlace1', component: Enlace1Component },
      { path: 'enlace2', component: Enlace2Component },
      { path: 'diagnostic-menu', component: DiagnosticMenuComponent },
      { path: 'diagnostic/:categoryId', component: InteractiveDiagnosticComponent },
      { path: 'create-ticket', component: CreateTicketComponent }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
