import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component/login.component';
import { authGuard } from './core/guards/auth-guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
import { InteractiveDiagnosticComponent } from './customer/components/interactive-diagnostic/interactive-diagnostic.component';
import { CreateTicketComponent } from './customer/components/create-ticket/create-ticket.component';
import { DiagnosticMenuComponent } from './customer/components/diagnostic-menu/diagnostic-menu.component';
import { Dashboard } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  
  // Rutas protegidas por authGuard con el MainLayout
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Redirección por defecto
      { path: '', component: Dashboard, pathMatch: 'full' },
      
      // --- 1. SECCIÓN USUARIO ---
      { path: 'customer/support', component: DiagnosticMenuComponent },

      
      // --- FLUJO INTERNO DE TICKETS ---
      { path: 'diagnostic/:categoryId', component: InteractiveDiagnosticComponent },
      { path: 'create-ticket', component: CreateTicketComponent },

      // --- 2. SECCIÓN SOPORTE TI ---
      {
        path: 'support/tickets',
        loadComponent: () =>
          import('./support/components/ticket-list/ticket-list.component').then(
            (m) => m.TicketListComponent
          )
      },
      {
        path: 'support/history',
        loadComponent: () =>
          import('./support/components/ticket-history/ticket-history.component').then(
            (m) => m.TicketHistoryComponent
          )
      },

      // --- 3. SECCIÓN ADMINISTRADOR (Comodines temporales) ---
      { path: 'customer/history', redirectTo: 'customer/support', pathMatch: 'full' },
      { path: 'admin/users', redirectTo: 'customer/support', pathMatch: 'full' },
      { path: 'admin/tickets', redirectTo: 'customer/support', pathMatch: 'full' },
      { path: 'admin/train-model', redirectTo: 'customer/support', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
