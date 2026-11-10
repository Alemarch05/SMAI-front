import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';

@Component({
  selector: 'app-diagnostic-menu',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './diagnostic-menu.component.html',
  styleUrl: './diagnostic-menu.component.scss'
})
export class DiagnosticMenuComponent {
  private router = inject(Router);

  categorias = [
    { id: 1, title: 'Hardware y Encendido', icon: 'computer', desc: 'El equipo no enciende o fallos físicos' },
    { id: 2, title: 'Red y Conexión', icon: 'wifi_off', desc: 'Sin internet o fallos de VPN' },
    { id: 3, title: 'Software y Aplicaciones', icon: 'apps', desc: 'Programas que se cierran o arrojan error' },
    { id: 4, title: 'Lentitud del Sistema', icon: 'speed', desc: 'El equipo responde muy lento' }
  ];

  irAlArbol(id: number): void {
    // Navega a la ruta dinámica del diagnóstico
    this.router.navigate(['/diagnostic', id]);
  }
}