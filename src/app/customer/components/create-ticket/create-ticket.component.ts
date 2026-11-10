import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { MaterialModule } from '../../../shared/material.module';
import { TicketService } from '../../../core/services/ticket.service';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './create-ticket.component.html',
  styleUrl: './create-ticket.component.scss'
})
export class CreateTicketComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); 
  
  ticketForm: FormGroup;
  
  ubicacionesPredefinidas = ['Operaciones y Planta Física', 'Sistemas', 'Administración', 'Otros'];
  
  familiaActual: number = 1; 
  customIdActual: number = 11;
  opcionesActuales: string[] = [];

  diccionarioIncidencias: any = {
    1: {
      predeterminadas: ['El equipo no da video', 'Se apaga repentinamente', 'Ruidos extraños en la torre', 'Fallo en teclado/mouse'],
      customId: 11
    },
    2: {
      predeterminadas: ['Sin acceso a internet', 'No conecta a la red WiFi', 'Caídas intermitentes', 'Fallo de acceso a la VPN'],
      customId: 22
    },
    3: {
      predeterminadas: ['Un programa se cierra solo', 'Pantalla azul o error del sistema', 'Error de credenciales o contraseñas'],
      customId: 33
    },
    4: {
      predeterminadas: ['Demora mucho al encender', 'Lentitud extrema al abrir un programa', 'Se congela la pantalla constantemente'],
      customId: 44
    }
  };

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

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['family']) {
        this.familiaActual = Number(params['family']);
      }
      
      const datosFamilia = this.diccionarioIncidencias[this.familiaActual];
      if (datosFamilia) {
        this.opcionesActuales = datosFamilia.predeterminadas;
        this.customIdActual = datosFamilia.customId;
      }
    });
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
      if (value === 'Otro') {
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

      
      let finalCategoryId = this.familiaActual;     
      let finalTitle = formValues.incidenciaSelect; 

      
      if (formValues.incidenciaSelect === 'Otro') {
        finalCategoryId = this.customIdActual;      
        finalTitle = formValues.incidenciaOtra;     
      }

      const payload = {
        location: finalLocation,
        category_id: finalCategoryId,
        title: finalTitle,
        description: formValues.descripcion
      };

      this.ticketService.createTicket(payload).subscribe({
        next: (response) => {
          console.log('Ticket generado con éxito:', response);
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