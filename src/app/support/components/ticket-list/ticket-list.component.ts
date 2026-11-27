import {
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@shared/material.module';
import { AuthService } from '@core/services/auth/auth.service';
import {
  ApiCollectionResponse,
  CreateSupportTicketPayload,
  SupportTicket,
  TicketService,
  TicketResolutionPayload,
  UpdateTicketPayload
} from '../../services/ticket.service';

export type BadgeVariant = 'chip--green' | 'chip--amber' | 'chip--red' | 'chip--neutral';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paginator = viewChild(MatPaginator);
  private readonly sort = viewChild(MatSort);
  private readonly createDialogTemplate = viewChild<TemplateRef<unknown>>('createTicketTemplate');
  private readonly editDialogTemplate = viewChild<TemplateRef<unknown>>('editTicketTemplate');
  private readonly deleteDialogTemplate = viewChild<TemplateRef<unknown>>('deleteTicketTemplate');
  private readonly ticketDetailsDialogTemplate =
    viewChild<TemplateRef<unknown>>('ticketDetailsTemplate');
  private readonly resolutionDialogTemplate =
    viewChild<TemplateRef<unknown>>('ticketResolutionTemplate');

  private activeDialogRef: MatDialogRef<unknown> | null = null;
  private detailsDialogRef: MatDialogRef<unknown> | null = null;

  readonly displayedColumns: readonly string[] = [
    'id',
    'created_at',
    'user_name',
    'description',
    'priority',
    'status',
    'actions'
  ];
  readonly isAdmin = this.normalizeText(this.authService.getUserRole() ?? '').includes('admin');
  readonly canAssignTickets = ['soporte', 'support', 'tecnico'].some((role) =>
    this.normalizeText(this.authService.getUserRole() ?? '').includes(role)
  );

  readonly priorityOptions: readonly { value: string; label: string }[] = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'ALTA', label: 'Alta Prioridad' }
  ];

  readonly statusOptions: readonly { value: string; label: string }[] = [
    { value: 'PENDIENTE_DIAGNOSTICO', label: 'Pendiente Diagnóstico' },
    { value: 'ESCALADO', label: 'Escalado' },
    { value: 'EN_PROCESO', label: 'En Proceso' },
    { value: 'RESUELTO', label: 'Resuelto' },
    { value: 'CERRADO', label: 'Cerrado' }
  ];

  readonly locationOptions: readonly string[] = [
    'Operaciones y Planta Física',
    'Sistemas',
    'Administración',
    'Trabajo Remoto (Home Office)'
  ];

  readonly categoryOptions: readonly { id: number; name: string }[] = [
    { id: 1, name: 'Hardware y Encendido' },
    { id: 2, name: 'Red y Conexión' },
    { id: 3, name: 'Software y Aplicaciones' },
    { id: 4, name: 'Lentitud del Sistema' }
  ];

  readonly dataSource = new MatTableDataSource<SupportTicket>([]);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isCreating = signal<boolean>(false);
  readonly isUpdating = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly assigningTicketId = signal<string | null>(null);
  readonly assignedTicketIds = signal<Set<string>>(new Set());
  readonly resolvingTicketId = signal<string | null>(null);
  readonly isLoadingTicketDetails = signal<boolean>(false);
  readonly searchTerm = signal<string>('');

  readonly selectedTicket = signal<SupportTicket | null>(null);
  readonly ticketDetails = signal<SupportTicket | null>(null);
  readonly ticketToDelete = signal<SupportTicket | null>(null);
  readonly ticketToResolve = signal<SupportTicket | null>(null);

  readonly totalTickets = computed(() => this.tickets().length);
  readonly highPriorityCount = computed(
    () => this.tickets().filter((t) => this.getBadgeClass(t.priority) === 'chip--red').length
  );
  readonly pendingCount = computed(
    () => this.tickets().filter((t) => this.getBadgeClass(t.status) === 'chip--amber').length
  );

  // Formulario reactivo para Crear Ticket (POST http://127.0.0.1:8001/api/tickets)
  readonly createTicketForm = this.fb.group({
    user_name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    title: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    location: this.fb.nonNullable.control('Sistemas', [Validators.required]),
    category_id: this.fb.nonNullable.control(1, [Validators.required]),
    priority: this.fb.nonNullable.control('MEDIA', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5)])
  });

  // Formulario reactivo para Editar estado, prioridad o descripción (PUT http://127.0.0.1:8001/api/tickets/:id)
  readonly editTicketForm = this.fb.group({
    priority: this.fb.nonNullable.control('MEDIA', [Validators.required]),
    status: this.fb.nonNullable.control('PENDIENTE_DIAGNOSTICO', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)])
  });

  readonly resolutionForm = this.fb.group({
    cause: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(255)
    ]),
    solution: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]),
    standard_solution: this.fb.nonNullable.control('', [Validators.maxLength(255)])
  });

  private readonly standardSolutionsByCategory: Readonly<Record<string, readonly string[]>> = {
    'Fallo de Encendido / Hardware': [
      'Revisé las conexiones eléctricas, la regleta y el cable de poder.',
      'Mantuve presionado el botón de encendido 15 segundos para descargar la estática.',
      'Limpié y reinserté las memorias RAM y probé con otra fuente de poder.'
    ],
    'Hardware (Personalizado)': [
      'Inspeccioné físicamente el componente reportado para descartar daños visibles.',
      'Ajusté los conectores internos y periféricos vinculados al fallo.',
      'Realicé pruebas aisladas y reemplacé la pieza defectuosa.'
    ],
    'Fallo de Red o Conexión': [
      'Verifiqué que el modo avión estuviera apagado y revisé el cable Ethernet.',
      'Ejecuté ipconfig /release, ipconfig /renew y ipconfig /flushdns en consola.',
      'Actualicé el controlador de la tarjeta de red y probé la salida a internet.'
    ],
    'Red (Personalizado)': [
      'Revisé la configuración de IP estática/DHCP y la puerta de enlace del equipo.',
      'Comprobé el estado del puerto en el switch y el punto de acceso cercano.',
      'Restablecí los adaptadores de red y validé los permisos de conexión local.'
    ],
    'Problema de Software / Aplicaciones': [
      'Forcé el cierre de la aplicación desde el Administrador de tareas y la reinicié.',
      'Limpié la caché y los archivos temporales del programa afectado.',
      'Ejecuté una reparación de la instalación y validé los permisos de usuario.'
    ],
    'Software (Personalizado)': [
      'Revisé el visor de eventos para identificar el error exacto de la aplicación.',
      'Verifiqué e instalé las librerías y dependencias faltantes del programa.',
      'Reinstalé la versión compatible del software y ajusté su configuración.'
    ],
    'Lentitud del Equipo o Sistema': [
      'Cerré las aplicaciones pesadas en segundo plano y liberé espacio en el disco C:.',
      'Deshabilité los programas innecesarios del inicio automático de Windows.',
      'Ejecuté sfc /scannow y DISM para reparar archivos corruptos del sistema.'
    ],
    'Lentitud (Personalizado)': [
      'Monitoreé el consumo de CPU, RAM y disco durante la tarea específica.',
      'Detuve los procesos que generaban cuello de botella en el rendimiento.',
      'Realicé limpieza de temporales y verifiqué el estado de salud del disco.'
    ]
  };

  constructor() {
    effect(() => {
      const paginatorInstance = this.paginator();
      const sortInstance = this.sort();

      if (paginatorInstance) {
        this.dataSource.paginator = paginatorInstance;
      }
      if (sortInstance) {
        this.dataSource.sort = sortInstance;
      }
    });

    this.configureFilterPredicate();
  }

  ngOnInit(): void {
    this.loadOpenTickets();
  }

  /**
   * Consume GET http://127.0.0.1:8001/api/tickets y actualiza el MatTableDataSource.
   */
  loadOpenTickets(): void {
    this.isLoading.set(true);

    this.ticketService
      .getOpenTickets()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const normalized = this.extractTickets(response);
          this.tickets.set(normalized);
          this.dataSource.data = normalized;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al obtener tickets:', err);
          const msg = this.extractBackendError(
            err,
            'No fue posible cargar los tickets abiertos (puerto 8001).'
          );
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.searchTerm.set(value);
    this.dataSource.filter = this.normalizeText(value);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openTicketDetails(ticket: SupportTicket): void {
    const template = this.ticketDetailsDialogTemplate();
    if (!template || this.isLoadingTicketDetails()) {
      return;
    }

    this.ticketDetails.set(ticket);
    this.isLoadingTicketDetails.set(true);
    this.detailsDialogRef = this.dialog.open(template, {
      width: '980px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      minHeight: '72vh',
      panelClass: 'ticket-detail-dialog',
      disableClose: true
    });

    this.ticketService
      .getTicketById(ticket.id)
      .pipe(
        finalize(() => this.isLoadingTicketDetails.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.closeTicketDetails();
            this.snackBar.open(
              response.message || 'El servicio no devolvió el detalle del ticket.',
              'Cerrar',
              { duration: 4500 }
            );
            return;
          }

          this.ticketDetails.set({
            ...ticket,
            ...response.data,
            category_name:
              response.data.category?.name ??
              response.data.category_name ??
              ticket.category_name
          });
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al obtener el detalle del ticket:', err);
          this.closeTicketDetails();
          this.snackBar.open(
            this.extractBackendError(err, 'No fue posible cargar el detalle del ticket.'),
            'Cerrar',
            { duration: 5000 }
          );
        }
      });
  }

  closeTicketDetails(): void {
    this.detailsDialogRef?.close();
    this.detailsDialogRef = null;
    this.ticketDetails.set(null);
  }

  getStandardSolutions(ticket: SupportTicket | null): readonly string[] {
    const rawCategory = ticket?.category?.name ?? ticket?.category_name ?? '';
    const category = this.normalizeText(rawCategory);
    const isCustom = category.includes('personalizado');

    if (category.includes('hardware') || category.includes('encendido')) {
      return this.standardSolutionsByCategory[
        isCustom ? 'Hardware (Personalizado)' : 'Fallo de Encendido / Hardware'
      ];
    }
    if (category.includes('red') || category.includes('conexion')) {
      return this.standardSolutionsByCategory[
        isCustom ? 'Red (Personalizado)' : 'Fallo de Red o Conexión'
      ];
    }
    if (category.includes('software') || category.includes('aplicacion')) {
      return this.standardSolutionsByCategory[
        isCustom ? 'Software (Personalizado)' : 'Problema de Software / Aplicaciones'
      ];
    }
    if (category.includes('lentitud')) {
      return this.standardSolutionsByCategory[
        isCustom ? 'Lentitud (Personalizado)' : 'Lentitud del Equipo o Sistema'
      ];
    }
    return [];
  }

  selectStandardSolution(solution: string): void {
    if (solution) {
      this.resolutionForm.controls.solution.setValue(solution);
    }
  }

  formatDiagnostic(diagnostic: unknown): string {
    if (typeof diagnostic === 'string') {
      return diagnostic;
    }
    return JSON.stringify(diagnostic, null, 2);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Abre el modal para crear un nuevo ticket o permite ir a la vista de creación.
   */
  openCreateTicketDialog(): void {
    this.createTicketForm.reset({
      user_name: '',
      title: '',
      location: 'Sistemas',
      category_id: 1,
      priority: 'MEDIA',
      description: ''
    });

    const tpl = this.createDialogTemplate();
    if (tpl) {
      this.activeDialogRef = this.dialog.open(tpl, {
        width: '500px',
        maxWidth: '95vw',
        disableClose: true
      });
    } else {
      this.router.navigate(['/create-ticket']);
    }
  }

  /**
   * Redirige a la vista de creación con diagnóstico si el usuario prefiere el asistente.
   */
  goToCreateTicketView(): void {
    this.closeDialog();
    this.router.navigate(['/create-ticket']);
  }

  /**
   * Envía POST http://127.0.0.1:8001/api/tickets y refresca automáticamente la tabla.
   */
  submitNewTicket(): void {
    if (this.createTicketForm.invalid || this.isCreating()) {
      this.createTicketForm.markAllAsTouched();
      return;
    }

    const raw = this.createTicketForm.getRawValue();
    const payload: CreateSupportTicketPayload = {
      user_name: raw.user_name.trim(),
      title: raw.title.trim(),
      location: raw.location,
      category_id: raw.category_id,
      priority: raw.priority,
      description: raw.description.trim()
    };

    this.isCreating.set(true);

    this.ticketService
      .createTicket(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.closeDialog();
          this.snackBar.open(
            res?.message || 'Ticket creado exitosamente.',
            'Cerrar',
            { duration: 3500 }
          );
          this.loadOpenTickets();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al crear ticket:', err);
          const msg = this.extractBackendError(err, 'No fue posible crear el ticket.');
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  /**
   * Abre el modal de edición precargando prioridad, estado y descripción del ticket.
   */
  openEditDialog(ticket: SupportTicket): void {
    if (!this.isAdmin) {
      return;
    }

    this.selectedTicket.set(ticket);
    this.editTicketForm.reset({
      priority: this.normalizePriorityValue(ticket.priority),
      status: this.normalizeStatusValue(ticket.status),
      description: ticket.description || ''
    });

    const tpl = this.editDialogTemplate();
    if (tpl) {
      this.activeDialogRef = this.dialog.open(tpl, {
        width: '480px',
        maxWidth: '95vw',
        disableClose: true
      });
    }
  }

  /**
   * Envía PUT http://127.0.0.1:8001/api/tickets/:id con estado, prioridad y descripción.
   */
  saveTicketChanges(): void {
    const target = this.selectedTicket();
    if (!this.isAdmin || !target || this.editTicketForm.invalid || this.isUpdating()) {
      this.editTicketForm.markAllAsTouched();
      return;
    }

    const raw = this.editTicketForm.getRawValue();
    const payload: UpdateTicketPayload = {
      priority: raw.priority,
      status: raw.status,
      description: raw.description.trim()
    };

    this.isUpdating.set(true);

    this.ticketService
      .updateTicket(target.id, payload)
      .pipe(
        finalize(() => this.isUpdating.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          const updatedList = this.tickets().map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  priority: payload.priority,
                  status: payload.status,
                  description: payload.description ?? item.description
                }
              : item
          );
          this.tickets.set(updatedList);
          this.dataSource.data = updatedList;
          this.closeDialog();
          this.snackBar.open(
            res?.message || `Ticket #${target.id} actualizado correctamente.`,
            'Cerrar',
            { duration: 3500 }
          );
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al actualizar ticket:', err);
          const msg = this.extractBackendError(
            err,
            'Error al actualizar el ticket en ticket-service (puerto 8001).'
          );
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  /**
   * Abre el modal de confirmación antes de eliminar un ticket.
   */
  openDeleteConfirm(ticket: SupportTicket): void {
    if (!this.isAdmin) {
      return;
    }

    this.ticketToDelete.set(ticket);
    const tpl = this.deleteDialogTemplate();
    if (tpl) {
      this.activeDialogRef = this.dialog.open(tpl, {
        width: '420px',
        maxWidth: '95vw'
      });
    }
  }

  /**
   * Ejecuta DELETE http://127.0.0.1:8001/api/tickets/:id y actualiza la tabla automáticamente.
   */
  confirmDeleteTicket(): void {
    const target = this.ticketToDelete();
    if (!this.isAdmin || !target || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.ticketService
      .deleteTicket(target.id)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          const remaining = this.tickets().filter((t) => t.id !== target.id);
          this.tickets.set(remaining);
          this.dataSource.data = remaining;
          this.closeDialog();
          this.snackBar.open(
            res?.message || `Ticket #${target.id} eliminado correctamente.`,
            'Cerrar',
            { duration: 3500 }
          );
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al eliminar ticket:', err);
          const msg = this.extractBackendError(
            err,
            'No fue posible eliminar el ticket seleccionado.'
          );
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  assignTicket(ticket: SupportTicket): void {
    if (
      !this.canAssignTickets ||
      this.assigningTicketId() !== null ||
      this.isTicketAssigned(ticket)
    ) {
      return;
    }

    this.assigningTicketId.set(String(ticket.id));
    this.ticketService
      .assignTicket(ticket.id)
      .pipe(
        finalize(() => this.assigningTicketId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.assignedTicketIds.update((ids) => new Set(ids).add(String(ticket.id)));
          const updatedTicket: SupportTicket = {
            ...ticket,
            ...response.data,
            assigned_to: response.data?.assigned_to ?? ticket.assigned_to,
            status: response.data?.status ?? ticket.status
          };
          const updatedList = this.tickets().map((item) =>
            item.id === ticket.id ? { ...item, ...updatedTicket } : item
          );
          this.tickets.set(updatedList);
          this.dataSource.data = updatedList;
          this.ticketDetails.update((details) =>
            details?.id === ticket.id ? { ...details, ...updatedTicket } : details
          );
          this.snackBar.open(
            response?.message || `Ticket #${ticket.id} asignado correctamente.`,
            'Cerrar',
            { duration: 3500 }
          );
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al asignar ticket:', err);
          this.snackBar.open(
            'No fue posible asignarte el ticket seleccionado.',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  isTicketAssigning(ticket: SupportTicket): boolean {
    return this.assigningTicketId() === String(ticket.id);
  }

  isTicketAssigned(ticket: SupportTicket): boolean {
    return (
      this.assignedTicketIds().has(String(ticket.id)) ||
      (ticket.assigned_to !== null && ticket.assigned_to !== undefined)
    );
  }

  isTicketResolved(ticket: SupportTicket): boolean {
    const status = this.normalizeText(ticket.status);
    return (
      status.includes('resuelto') ||
      status.includes('resolved') ||
      status.includes('completado') ||
      status.includes('completed') ||
      status.includes('cerrado')
    );
  }

  isTicketResolving(ticket: SupportTicket | null | undefined): boolean {
    if (!ticket) {
      return false;
    }
    return this.resolvingTicketId() === String(ticket.id);
  }

  openResolutionDialog(ticket: SupportTicket): void {
    if (!this.canAssignTickets || !this.isTicketAssigned(ticket) || this.isTicketResolved(ticket)) {
      return;
    }

    this.ticketToResolve.set(ticket);
    this.resolutionForm.reset({ cause: '', solution: '', standard_solution: '' });
    const template = this.resolutionDialogTemplate();
    if (template) {
      this.activeDialogRef = this.dialog.open(template, {
        width: '540px',
        maxWidth: '95vw',
        disableClose: true
      });
    }
  }

  submitResolution(): void {
    const target = this.ticketToResolve();
    if (
      !this.canAssignTickets ||
      !target ||
      this.resolutionForm.invalid ||
      this.resolvingTicketId() !== null
    ) {
      this.resolutionForm.markAllAsTouched();
      return;
    }

    const formValue = this.resolutionForm.getRawValue();
    const payload: TicketResolutionPayload = {
      cause: formValue.cause.trim(),
      solution: formValue.solution.trim()
    };
    if (formValue.standard_solution.trim()) {
      payload.standard_solution = formValue.standard_solution.trim();
    }
    if (!payload.cause || !payload.solution) {
      this.resolutionForm.markAllAsTouched();
      return;
    }

    this.resolvingTicketId.set(String(target.id));
    this.ticketService
      .resolveTicket(target.id, payload)
      .pipe(
        finalize(() => this.resolvingTicketId.set(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const updatedList = this.tickets().map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  cause: payload.cause,
                  solution: payload.solution,
                  standard_solution: payload.standard_solution ?? null,
                  status: response.data?.status ?? 'RESUELTO'
                }
              : item
          );
          this.tickets.set(updatedList);
          this.dataSource.data = updatedList;
          this.ticketDetails.update((details) =>
            details?.id === target.id
              ? {
                  ...details,
                  ...response.data,
                  cause: payload.cause,
                  solution: payload.solution,
                  standard_solution: payload.standard_solution ?? null,
                  status: response.data?.status ?? 'RESUELTO'
                }
              : details
          );
          this.closeDialog();
          this.snackBar.open(
            response.message || `Ticket #${target.id} marcado como solucionado.`,
            'Cerrar',
            { duration: 3500 }
          );
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al registrar la solución del ticket:', err);
          this.snackBar.open(
            'No fue posible registrar la causa y solución del ticket.',
            'Cerrar',
            { duration: 4000 }
          );
        }
      });
  }

  closeDialog(): void {
    this.activeDialogRef?.close();
    this.activeDialogRef = null;
    this.selectedTicket.set(null);
    this.ticketToDelete.set(null);
    this.ticketToResolve.set(null);
  }

  getBadgeClass(rawValue: string | null | undefined): BadgeVariant {
    const value = this.normalizeText(rawValue ?? '');

    if (
      value.includes('resuelto') ||
      value.includes('completado') ||
      value.includes('cerrado') ||
      value.includes('resolved') ||
      value.includes('completed')
    ) {
      return 'chip--green';
    }

    if (
      value.includes('alta') ||
      value.includes('critica') ||
      value.includes('urgente') ||
      value.includes('high') ||
      value.includes('critical')
    ) {
      return 'chip--red';
    }

    if (
      value.includes('pendiente') ||
      value.includes('proceso') ||
      value.includes('abierto') ||
      value.includes('media') ||
      value.includes('pending') ||
      value.includes('in_progress') ||
      value.includes('open') ||
      value.includes('medium')
    ) {
      return 'chip--amber';
    }

    return 'chip--neutral';
  }

  isValidDate(dateValue: string | null | undefined): boolean {
    if (!dateValue) {
      return false;
    }
    return !Number.isNaN(Date.parse(dateValue));
  }

  private extractBackendError(err: HttpErrorResponse, fallback: string): string {
    const errorBody = err.error;

    if (typeof errorBody === 'string' && errorBody.trim().length > 0) {
      return errorBody;
    }

    if (errorBody && typeof errorBody === 'object') {
      const record = errorBody as Record<string, unknown>;

      const validationErrors = record['errors'];
      if (validationErrors && typeof validationErrors === 'object') {
        const messages = Object.values(validationErrors as Record<string, unknown>)
          .flatMap((val) => (Array.isArray(val) ? val : [val]))
          .filter((msg): msg is string => typeof msg === 'string' && msg.trim().length > 0);

        if (messages.length > 0) {
          return messages.join(' | ');
        }
      }

      if (typeof record['message'] === 'string' && record['message'].trim().length > 0) {
        return record['message'];
      }

      if (typeof record['error'] === 'string' && record['error'].trim().length > 0) {
        return record['error'];
      }
    }

    if (err.status === 0) {
      return 'Sin conexión con ticket-service (puerto 8001). Verifique que el backend esté activo.';
    }

    return fallback;
  }

  private configureFilterPredicate(): void {
    this.dataSource.filterPredicate = (ticket: SupportTicket, filter: string): boolean => {
      const searchableContent = this.normalizeText(
        `${ticket.id} ${ticket.created_at} ${ticket.user_name} ${ticket.description} ${ticket.priority} ${ticket.status}`
      );
      return searchableContent.includes(filter);
    };
  }

  private extractTickets(
    response: ApiCollectionResponse<SupportTicket> | SupportTicket[]
  ): SupportTicket[] {
    let rawList: unknown[] = [];

    if (Array.isArray(response)) {
      rawList = response;
    } else if (Array.isArray(response?.data)) {
      rawList = response.data;
    } else if (response?.data && typeof response.data === 'object') {
      rawList = response.data.data ?? response.data.items ?? [];
    } else if (Array.isArray(response?.tickets)) {
      rawList = response.tickets;
    }

    return rawList.map((item, idx) => {
      const record = (item ?? {}) as Record<string, unknown>;
      const nestedUser = record['user'] as Record<string, unknown> | undefined;

      return {
        id: (record['id'] as number | string) ?? idx + 1,
        created_at: String(record['created_at'] ?? record['fecha'] ?? ''),
        user_name: String(
          record['user_name'] ??
            nestedUser?.['name'] ??
            record['customer_name'] ??
            'Usuario Cliente'
        ),
        title: record['title'] ? String(record['title']) : undefined,
        description: String(
          record['description'] ?? record['descripcion'] ?? record['title'] ?? 'Sin descripción'
        ),
        priority: String(record['priority'] ?? record['prioridad'] ?? 'Media'),
        status: String(record['status'] ?? record['estado'] ?? 'Pendiente'),
        assigned_to: (record['assigned_to'] as number | string | null | undefined) ?? null,
        category_id: record['category_id'] as number | string | undefined,
        category_name: String(
          (record['category'] as Record<string, unknown> | undefined)?.['name'] ??
            record['category_name'] ??
            ''
        ),
        category: record['category'] as SupportTicket['category']
      };
    });
  }

  private normalizePriorityValue(rawPriority: string | null | undefined): string {
    const value = this.normalizeText(rawPriority ?? '');
    if (value.includes('alta') || value.includes('critica') || value.includes('high')) {
      return 'ALTA';
    }
    if (value.includes('baja') || value.includes('low')) {
      return 'BAJA';
    }
    return 'MEDIA';
  }

  private normalizeStatusValue(rawStatus: string | null | undefined): string {
    const value = this.normalizeText(rawStatus ?? '');
    if (value.includes('cerrado')) {
      return 'CERRADO';
    }
    if (value.includes('resuelto') || value.includes('completado')) {
      return 'RESUELTO';
    }
    if (value.includes('proceso')) {
      return 'EN_PROCESO';
    }
    if (value.includes('escalado')) {
      return 'ESCALADO';
    }
    return 'PENDIENTE_DIAGNOSTICO';
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
