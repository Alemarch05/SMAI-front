import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component/login.component';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
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
      // Redirección por defecto
      { path: '', redirectTo: 'customer/support', pathMatch: 'full' },
      
      // --- 1. SECCIÓN USUARIO ---
      { path: 'customer/support', component: DiagnosticMenuComponent },

      
      // --- FLUJO INTERNO DE TICKETS ---
      {
        path: 'diagnostic/:categoryId',
        component: InteractiveDiagnosticComponent,
        canActivate: [roleGuard],
        data: { roles: ['cliente'] }
      },
      {
        path: 'create-ticket',
        component: CreateTicketComponent,
        canActivate: [roleGuard],
        data: { roles: ['cliente'] }
      },

      // --- 2. SECCIÓN SOPORTE TI ---
      {
        path: 'support/tickets',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'soporte'] },
        loadComponent: () =>
          import('./support/components/ticket-list/ticket-list.component').then(
            (m) => m.TicketListComponent
          )
      },
      {
        path: 'support/history',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'soporte'] },
        loadComponent: () =>
          import('./support/components/ticket-history/ticket-history.component').then(
            (m) => m.TicketHistoryComponent
          )
      },

      // --- 3. SECCIÓN ADMINISTRADOR E HISTORIAL CLIENTE ---
      {
        path: 'customer/history',
        canActivate: [roleGuard],
        data: { roles: ['cliente'] },
        loadComponent: () =>
          import('./support/components/ticket-history/ticket-history.component').then(
            (m) => m.TicketHistoryComponent
          )
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./admin/components/user-management/user-management.component').then(
            (m) => m.UserManagementComponent
          )
      },
      {
        path: 'admin/tickets',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./support/components/ticket-list/ticket-list.component').then(
            (m) => m.TicketListComponent
          )
      },
      {
        path: 'admin/train-model',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./admin/components/model-training/model-training.component').then(
            (m) => m.ModelTrainingComponent
          )
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
