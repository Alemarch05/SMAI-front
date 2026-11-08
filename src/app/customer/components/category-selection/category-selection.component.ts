import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@shared/material.module';
import {
  CategoriesApiResponse,
  Category,
  CategoryService,
  CreateTicketPayload,
  CreateTicketResponse,
  LocationOption
} from '../../services/category.service';

@Component({
  selector: 'app-category-selection',
  standalone: true,
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './category-selection.component.html',
  styleUrl: './category-selection.component.scss'
})
export class CategorySelectionComponent implements OnInit {
  private static readonly DEFAULT_LOCATIONS: LocationOption[] = [
    { id: 1, name: 'Sede Principal - Área Administrativa' },
    { id: 2, name: 'Sede Principal - Sala de Sistemas' },
    { id: 3, name: 'Operaciones y Planta Física' },
    { id: 4, name: 'Atención al Usuario / Recepción' },
    { id: 5, name: 'Trabajo Remoto (Home Office)' }
  ];

  // Inyección de dependencias con inject() (Angular 19+)
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly formDirective = viewChild(FormGroupDirective);

  // Entrada opcional y evento de salida para integración con flujos de diagnóstico Nivel 1
  readonly level1DiagnosticInput = input<unknown>(null, { alias: 'level1Diagnostic' });
  readonly ticketCreated = output<CreateTicketResponse>();

  // Estado reactivo local basado en Signals
  readonly locations = signal<LocationOption[]>(CategorySelectionComponent.DEFAULT_LOCATIONS);
  readonly categories = signal<Category[]>([]);
  readonly selectedLocation = signal<string>('');
  readonly isLoadingCategories = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly localDiagnostic = signal<unknown>(null);

  // Diagnóstico Nivel 1 consolidado (prioriza input, estado de navegación o servicio/localStorage)
  readonly activeDiagnostic = computed<unknown>(
    () =>
      this.level1DiagnosticInput() ??
      this.localDiagnostic() ??
      this.categoryService.getLevel1Diagnostic()
  );

  // Filtra dinámicamente incidencias si el backend asocia categorías por location_id
  readonly filteredCategories = computed<Category[]>(() => {
    const allCategories = this.categories();
    const locationName = this.selectedLocation();

    const hasLocationMapping = allCategories.some((cat) => cat.location_id != null);
    if (!hasLocationMapping || !locationName) {
      return allCategories;
    }

    const matchedLocation = this.locations().find((loc) => loc.name === locationName);
    if (!matchedLocation?.id) {
      return allCategories;
    }

    return allCategories.filter(
      (cat) => cat.location_id == null || cat.location_id === matchedLocation.id
    );
  });

  // Formulario reactivo tipado con los controles requeridos en Fase 1
  readonly ticketForm = this.fb.group({
    location: this.fb.nonNullable.control('', [Validators.required]),
    category_id: this.fb.control<number | null>(null, [Validators.required]),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(1000)
    ])
  });

  ngOnInit(): void {
    this.captureNavigationDiagnostic();
    this.setupLocationSync();
    this.loadCategories();
  }

  /**
   * Envía los datos del formulario junto con `level1_diagnostic` (si existe) al microservicio de tickets.
   */
  onSubmit(): void {
    if (this.ticketForm.invalid || this.isSubmitting()) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    const { location, category_id, description } = this.ticketForm.getRawValue();
    const trimmedDescription = description.trim();

    if (!location || category_id === null || trimmedDescription.length < 10) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    const diagnostic = this.activeDiagnostic();
    const payload: CreateTicketPayload = {
      location,
      category_id,
      description: trimmedDescription,
      ...(this.hasDiagnosticValue(diagnostic) ? { level1_diagnostic: diagnostic } : {})
    };

    this.isSubmitting.set(true);

    this.categoryService
      .createTicket(payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.localDiagnostic.set(null);
          this.categoryService.clearLevel1Diagnostic();
          this.formDirective()?.resetForm({
            location: '',
            category_id: null,
            description: ''
          });
          this.selectedLocation.set('');

          this.snackBar.open(
            response?.message || '¡Ticket de soporte generado exitosamente!',
            'Cerrar',
            { duration: 4000 }
          );

          this.ticketCreated.emit(response);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al generar el ticket:', err);
          const backendMessage = (err.error as Record<string, unknown> | null)?.['message'];
          const message =
            typeof backendMessage === 'string'
              ? backendMessage
              : 'No fue posible generar el ticket. Verifique su conexión e intente nuevamente.';

          this.snackBar.open(message, 'Cerrar', { duration: 4500 });
        }
      });
  }

  /**
   * Carga las categorías desde GET http://127.0.0.1:8001/api/categories
   * soportando tanto arreglos directos como respuestas envueltas en `{ data: ... }`.
   */
  loadCategories(): void {
    this.isLoadingCategories.set(true);

    this.categoryService
      .getCategories()
      .pipe(
        finalize(() => this.isLoadingCategories.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.applyCategoriesResponse(response);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al cargar categorías:', err);
          this.snackBar.open(
            'Error al cargar las categorías de soporte. Intente recargar la página.',
            'Reintentar',
            { duration: 5000 }
          ).onAction().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.loadCategories();
          });
        }
      });
  }

  private setupLocationSync(): void {
    this.ticketForm.controls.location.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((locValue) => {
        this.selectedLocation.set(locValue);

        // Si la categoría actual ya no pertenece a la nueva ubicación filtrada, se limpia la selección
        const currentCategoryId = this.ticketForm.controls.category_id.value;
        if (
          currentCategoryId !== null &&
          !this.filteredCategories().some((cat) => cat.id === currentCategoryId)
        ) {
          this.ticketForm.controls.category_id.setValue(null);
        }
      });
  }

  private captureNavigationDiagnostic(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const navState = window.history.state as Record<string, unknown> | null;
    const stateDiagnostic = navState?.['level1_diagnostic'];
    if (this.hasDiagnosticValue(stateDiagnostic)) {
      this.localDiagnostic.set(stateDiagnostic);
    }
  }

  private applyCategoriesResponse(response: CategoriesApiResponse | Category[]): void {
    if (Array.isArray(response)) {
      this.categories.set(response);
      return;
    }

    if (Array.isArray(response?.data)) {
      this.categories.set(response.data);
      return;
    }

    if (response?.data && typeof response.data === 'object') {
      const nested = response.data;
      const extractedCategories = nested.categories ?? nested.incidences ?? [];
      this.categories.set(extractedCategories);

      if (Array.isArray(nested.locations) && nested.locations.length > 0) {
        const normalizedLocations: LocationOption[] = nested.locations.map((loc, idx) =>
          typeof loc === 'string' ? { id: idx + 1, name: loc } : loc
        );
        this.locations.set(normalizedLocations);
      }
      return;
    }

    if (Array.isArray(response?.categories)) {
      this.categories.set(response.categories);
    }
  }

  private hasDiagnosticValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  }
}
