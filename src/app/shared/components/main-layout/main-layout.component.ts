import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-main-layout.component',
  standalone: true,
  imports: [MaterialModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);

  readonly userRole = this.authService.getUserRole();
  readonly showCustomerMenu = this.userRole === 'cliente';
  readonly showSupportMenu = this.userRole === 'soporte' || this.userRole === 'admin';
  readonly showAdminMenu = this.userRole === 'admin';

  logout(): void {
    this.authService.logout();
  }
}