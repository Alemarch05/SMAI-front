import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component/login.component';
import { authGuard } from './core/guards/auth-guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
import { Enlace1Component } from './components/tests/enlace1.component/enlace1.component';
import { Enlace2Component } from './components/tests/enlace2.component/enlace2.component';

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

      // Módulo de Soporte al Cliente - Fase 1 (Lazy Loading)
      {
        path: 'customer/support',
        loadComponent: () =>
          import('./customer/components/category-selection/category-selection.component').then(
            (m) => m.CategorySelectionComponent
          )
      },
      { path: 'soporte', redirectTo: 'customer/support', pathMatch: 'full' },

      // Panel de Soporte TI - Fase 2 (Lazy Loading)
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
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
