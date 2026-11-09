import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material.module';
import { DiagnosticService } from '../../services/diagnostic.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-interactive-diagnostic',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterLink],
  templateUrl: './interactive-diagnostic.component.html',
  styleUrl: './interactive-diagnostic.component.scss'
})
export class InteractiveDiagnosticComponent implements OnInit {
  private diagnosticService = inject(DiagnosticService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  diagnosticTree: any = null;
  currentNodeId: string = 'node_1';
  currentNode: any = null;
  categoryId: string = '';
  isLoading = true;

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.paramMap.get('categoryId') || '1';
    this.loadDiagnosticTree();
  }

  loadDiagnosticTree(): void {
    console.log('Iniciando carga del diagnostico...');
    this.isLoading = true;
    this.currentNodeId = 'node_1';
    this.currentNode = null;
    this.cdr.detectChanges();

    this.diagnosticService.getDiagnosticTree(this.categoryId).subscribe({
      next: (response) => {
        console.log('Respuesta completa del backend:', response);
        if (response && response.data) {
          this.diagnosticTree = response.data;
          if (this.diagnosticTree[this.currentNodeId]) {
            this.currentNode = this.diagnosticTree[this.currentNodeId];
            console.log('Nodo actual cargado:', this.currentNode);
          } else {
            console.error(`El nodo '${this.currentNodeId}' no se encontro.`);
            this.currentNode = { type: 'error', text: 'Error: No se encontro la pregunta inicial.' };
          }
        } else {
           console.error('La respuesta no contiene "data".', response);
        }
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error HTTP al cargar el diagnostico:', err);
        this.currentNode = { type: 'error', text: 'Error de conexion con el servidor.' };
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  handleAnswer(answer: 'yes' | 'no'): void {
    if (!this.currentNode) return;
    const nextNodeId = answer === 'yes' ? this.currentNode.yes_next : this.currentNode.no_next;
    
    if (this.diagnosticTree[nextNodeId]) {
      this.currentNodeId = nextNodeId;
      this.currentNode = this.diagnosticTree[nextNodeId];
      this.cdr.detectChanges();
    } else {
      console.error(`No se encontro el nodo destino: ${nextNodeId}`);
    }
  }

  restartDiagnostic(): void {
    console.log('Reiniciando el arbol sin recargar la pagina...');
    this.currentNodeId = 'node_1';
    this.currentNode = this.diagnosticTree[this.currentNodeId];
    this.cdr.detectChanges();
  }

  goToCreateTicket(): void {
    this.router.navigate(['/create-ticket']);
  }
}