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
  TicketHistoryItem,
  TicketService
} from '../../services/ticket.service';

export type HistoryBadgeVariant = 'chip--green' | 'chip--amber' | 'chip--red' | 'chip--neutral';

@Component({
  selector: 'app-ticket-history',
  standalone: true,
  imports: [
    DatePipe,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule
  ],
  templateUrl: './ticket-history.component.html',
  styleUrl: './ticket-history.component.scss'
})
export class TicketHistoryComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paginator = viewChild(MatPaginator);
  private readonly sort = viewChild(MatSort);

  // Columnas requeridas en la tabla de Historial de Fase 2
  readonly displayedColumns: readonly string[] = [
    'fecha',
    'descripcion',
    'detalles',
    'status'
  ];

  readonly dataSource = new MatTableDataSource<TicketHistoryItem>([]);

  readonly historyItems = signal<TicketHistoryItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchTerm = signal<string>('');

  readonly totalHistory = computed(() => this.historyItems().length);
  readonly resolvedCount = computed(
    () =>
      this.historyItems().filter((item) => this.getStatusClass(item.status) === 'chip--green')
        .length
  );

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
    this.loadHistory();
  }

  /**
   * Consume GET http://127.0.0.1:8001/api/tickets/history y puebla la tabla.
   */
  loadHistory(): void {
    this.isLoading.set(true);

    this.ticketService
      .getTicketHistory()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const normalized = this.extractHistoryItems(response);
          this.historyItems.set(normalized);
          this.dataSource.data = normalized;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al cargar el historial de tickets:', err);
          this.snackBar.open(
            'No fue posible obtener el historial de tickets. Intente nuevamente.',
            'Cerrar',
            { duration: 4500 }
          );
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

  clearSearch(): void {
    this.searchTerm.set('');
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Asigna clases de color cohesivas para el estado en el historial:
   * - Verde: Resuelto / Completado / Cerrado
   * - Amarillo/Naranja: Pendiente / En Proceso
   * - Rojo: Alta Prioridad / Cancelado / Crítico
   */
  getStatusClass(rawStatus: string | null | undefined): HistoryBadgeVariant {
    const status = this.normalizeText(rawStatus ?? '');

    if (
      status.includes('resuelto') ||
      status.includes('completado') ||
      status.includes('cerrado') ||
      status.includes('resolved') ||
      status.includes('completed')
    ) {
      return 'chip--green';
    }

    if (
      status.includes('alta') ||
      status.includes('critica') ||
      status.includes('urgente') ||
      status.includes('cancelad') ||
      status.includes('rechazad')
    ) {
      return 'chip--red';
    }

    if (
      status.includes('pendiente') ||
      status.includes('proceso') ||
      status.includes('abierto') ||
      status.includes('pending') ||
      status.includes('in_progress')
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

  private configureFilterPredicate(): void {
    this.dataSource.filterPredicate = (item: TicketHistoryItem, filter: string): boolean => {
      const searchable = this.normalizeText(
        `${item.fecha} ${item.descripcion} ${item.detalles} ${item.status}`
      );
      return searchable.includes(filter);
    };
  }

  private extractHistoryItems(
    response: ApiCollectionResponse<TicketHistoryItem> | TicketHistoryItem[]
  ): TicketHistoryItem[] {
    let rawList: unknown[] = [];

    if (Array.isArray(response)) {
      rawList = response;
    } else if (Array.isArray(response?.data)) {
      rawList = response.data;
    } else if (response?.data && typeof response.data === 'object') {
      rawList = response.data.data ?? response.data.items ?? [];
    } else if (Array.isArray(response?.history)) {
      rawList = response.history;
    } else if (Array.isArray(response?.tickets)) {
      rawList = response.tickets;
    }

    return rawList.map((entry, idx) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      const rawDetails =
        record['detalles'] ??
        record['details'] ??
        record['resolution'] ??
        record['level1_diagnostic'];

      const formattedDetails =
        typeof rawDetails === 'object' && rawDetails !== null
          ? JSON.stringify(rawDetails)
          : String(rawDetails ?? 'Sin observaciones adicionales');

      return {
        id: (record['id'] as number | string) ?? idx + 1,
        fecha: String(record['fecha'] ?? record['updated_at'] ?? record['created_at'] ?? ''),
        descripcion: String(
          record['descripcion'] ?? record['description'] ?? 'Sin descripción registrada'
        ),
        detalles: formattedDetails,
        status: String(record['status'] ?? record['estado'] ?? 'Completado')
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

