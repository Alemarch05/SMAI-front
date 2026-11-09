import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MaterialModule } from '../../../shared/material.module';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MaterialModule
  ],
  templateUrl: './create-ticket.component.html',
  styleUrl: './create-ticket.component.scss'
})
export class CreateTicketComponent {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private router = inject(Router);
  
  ticketForm: FormGroup;
  
  ubicacionesPredefinidas = ['Operaciones y Planta Física', 'Sistemas', 'Administración', 'Otros'];
  
  incidenciasPredefinidas = [
    { id: 1, nombre: 'El equipo no enciende' },
    { id: 2, nombre: 'Fallo de red o conexión' },
    { id: 3, nombre: 'Problema de software' },
    { id: 99, nombre: 'Otros' } 
  ];

  constructor() {
    this.ticketForm = this.fb.group({
      ubicacionSelect: ['', Validators.required],
      ubicacionOtra: [''],
      incidenciaSelect: ['', Validators.required],
      incidenciaOtra: [''],
      descripcion: ['']
    });

    this.escucharCambiosSelect();
  }

  private escucharCambiosSelect(): void {
    this.ticketForm.get('ubicacionSelect')?.valueChanges.subscribe(value => {
      const controlOtra = this.ticketForm.get('ubicacionOtra');
      if (value === 'Otros') {
        controlOtra?.setValidators(Validators.required);
      } else {
        controlOtra?.clearValidators();
        controlOtra?.setValue('');
      }
      controlOtra?.updateValueAndValidity();
    });

    this.ticketForm.get('incidenciaSelect')?.valueChanges.subscribe(value => {
      const controlOtra = this.ticketForm.get('incidenciaOtra');
      if (value === 99) {
        controlOtra?.setValidators(Validators.required);
      } else {
        controlOtra?.clearValidators();
        controlOtra?.setValue('');
      }
      controlOtra?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.ticketForm.valid) {
      const formValues = this.ticketForm.value;
      
      const finalLocation = formValues.ubicacionSelect === 'Otros' 
        ? formValues.ubicacionOtra 
        : formValues.ubicacionSelect;

      
      let finalTitle = null;
      if (formValues.incidenciaSelect === 99) {
        
        finalTitle = formValues.incidenciaOtra; 
      } else {
        const incidenciaElegida = this.incidenciasPredefinidas.find(inc => inc.id === formValues.incidenciaSelect);
        finalTitle = incidenciaElegida ? incidenciaElegida.nombre : 'Ticket de soporte';
      }

      const finalDescription = formValues.descripcion; 

      const payload = {
        location: finalLocation,
        category_id: formValues.incidenciaSelect,
        title: finalTitle,                 
        description: finalDescription      
      };

      this.ticketService.createTicket(payload).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          alert('Ticket generado con éxito');
          this.router.navigate(['/']); 
        },
        error: (err) => {
          console.error('Error al generar el ticket:', err);
          alert('Hubo un error de comunicación con el servidor.');
        }
      });
    }
  }
}