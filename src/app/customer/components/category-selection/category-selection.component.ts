import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../../shared/material.module';
import { CategoryService } from '../../../core/services/category/category.service';
import { Location, Incidence } from '../../../core/interfaces/category/category.interface';

@Component({
  selector: 'app-category-selection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './category-selection.component.html',
  styleUrl: './category-selection.component.scss'
})
export class CategorySelectionComponent implements OnInit {

  // Evento que emite la selección al componente padre
  @Output() selectionChange = new EventEmitter<{ locationId: number; incidenceId: number }>();

  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Listas de opciones para los selectores
  locations: Location[] = [];
  incidences: Incidence[] = [];
  filteredIncidences: Incidence[] = [];

  // Estado de carga
  isLoading = true;

  // Formulario reactivo
  form: FormGroup = this.fb.group({
    locationId: [null, Validators.required],
    incidenceId: [null, Validators.required]
  });

  ngOnInit(): void {
    this.loadCategories();

    // Cuando cambia la ubicación, filtrar incidencias correspondientes y limpiar selección
    this.form.get('locationId')?.valueChanges.subscribe((locationId: number) => {
      this.form.get('incidenceId')?.setValue(null);
      this.filteredIncidences = this.incidences.filter(
        inc => inc.location_id === locationId
      );
    });

    // Emitir evento cuando el formulario es válido
    this.form.valueChanges.subscribe(() => {
      if (this.form.valid) {
        this.selectionChange.emit({
          locationId: this.form.value.locationId,
          incidenceId: this.form.value.incidenceId
        });
      }
    });
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.success) {
          this.locations = response.data.locations;
          this.incidences = response.data.incidences;
          // Si solo hay una ubicación la pre-seleccionamos
          if (this.locations.length === 1) {
            this.form.get('locationId')?.setValue(this.locations[0].id);
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.snackBar.open('No se pudieron cargar las categorías. Intente de nuevo.', 'Cerrar', {
          duration: 4000,
          panelClass: ['snack-error']
        });
        this.isLoading = false;
      }
    });
  }
}
