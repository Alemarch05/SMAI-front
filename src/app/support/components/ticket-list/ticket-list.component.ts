import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@shared/material.module';
import {
  ApiCollectionResponse,
  SupportTicket,
  TicketService
} from '../../services/ticket.service';

export type BadgeVariant = 'chip--green' | 'chip--amber' | 'chip--red' | 'chip--neutral';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    DatePipe,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule
  ],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paginator = viewChild(MatPaginator);
  private readonly sort = viewChild(MatSort);

  // Columnas requeridas en Fase 2
  readonly displayedColumns: readonly string[] = [
    'id',
    'created_at',
    'user_name',
    'description',
    'priority',
    'status'
  ];

  // Fuente de datos de Angular Material
  readonly dataSource = new MatTableDataSource<SupportTicket>([]);

  // Estado reactivo mediante Signals
  readonly tickets = signal<SupportTicket[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchTerm = signal<string>('');

  // Indicadores rápidos derivados con computed()
  readonly totalTickets = computed(() => this.tickets().length);
  readonly highPriorityCount = computed(
    () => this.tickets().filter((t) => this.getBadgeClass(t.priority) === 'chip--red').length
  );
  readonly pendingCount = computed(
    () => this.tickets().filter((t) => this.getBadgeClass(t.status) === 'chip--amber').length
  );

  constructor() {
    // Vincula reactivamente MatPaginator y MatSort cuando la tabla se renderiza en el DOM
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
          console.error('Error al obtener tickets abiertos:', err);
          this.snackBar.open(
            'No fue posible cargar los tickets abiertos. Verifique el servicio de soporte.',
            'Cerrar',
            { duration: 4500 }
          );
        }
      });
  }

  /**
   * Filtra dinámicamente las filas del MatTableDataSource desde el buscador superior.
   */
  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.searchTerm.set(value);
    this.dataSource.filter = this.normalizeText(value);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Retorna la clase visual dinámica para chips de Estado o Prioridad:
   * - Verde: Resuelto / Completado
   * - Amarillo/Naranja: Pendiente / En Proceso
   * - Rojo: Alta Prioridad / Crítica / Urgente
   */
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

  /**
   * Verifica si una fecha es válida para formatearla con DatePipe o mostrar el texto original.
   */
  isValidDate(dateValue: string | null | undefined): boolean {
    if (!dateValue) {
      return false;
    }
    return !Number.isNaN(Date.parse(dateValue));
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
        description: String(record['description'] ?? record['descripcion'] ?? 'Sin descripción'),
        priority: String(record['priority'] ?? record['prioridad'] ?? 'Media'),
        status: String(record['status'] ?? record['estado'] ?? 'Pendiente')
      };
    });
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

