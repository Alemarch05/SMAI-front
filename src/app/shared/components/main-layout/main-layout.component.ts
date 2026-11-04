import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-main-layout.component',
  standalone: true,
  imports: [MaterialModule, RouterOutlet, RouterLink],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}