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
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '@shared/material.module';
import {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserService,
  UsersApiResponse
} from '../../services/user.service';

export type RoleChipVariant = 'role--admin' | 'role--support' | 'role--customer';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly paginator = viewChild(MatPaginator);
  private readonly sort = viewChild(MatSort);
  private readonly userDialogTemplate = viewChild<TemplateRef<unknown>>('userDialogTemplate');
  private readonly deleteConfirmTemplate = viewChild<TemplateRef<unknown>>('deleteConfirmTemplate');

  private activeDialogRef: MatDialogRef<unknown> | null = null;

  readonly displayedColumns: readonly string[] = [
    'id',
    'name',
    'email',
    'role',
    'actions'
  ];

  readonly roleOptions = [
    { value: 'admin', label: 'Administrador' },
    { value: 'support', label: 'Soporte TI' },
    { value: 'customer', label: 'Cliente' }
  ];

  readonly dataSource = new MatTableDataSource<AdminUser>([]);

  readonly users = signal<AdminUser[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly searchTerm = signal<string>('');
  readonly hidePassword = signal<boolean>(true);

  readonly editingUser = signal<AdminUser | null>(null);
  readonly userToDelete = signal<AdminUser | null>(null);

  readonly isEditMode = computed(() => this.editingUser() !== null);
  readonly totalUsers = computed(() => this.users().length);
  readonly adminCount = computed(
    () => this.users().filter((u) => this.getRoleChipClass(u.role) === 'role--admin').length
  );
  readonly supportCount = computed(
    () => this.users().filter((u) => this.getRoleChipClass(u.role) === 'role--support').length
  );

  // Formulario reactivo para Crear y Editar usuarios
  readonly userForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    role: this.fb.nonNullable.control('customer', [Validators.required]),
    password: this.fb.nonNullable.control('')
  });

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
    this.loadUsers();
  }

  /**
   * Consulta GET http://127.0.0.1:8000/api/users
   */
  loadUsers(): void {
    this.isLoading.set(true);

    this.userService
      .getUsers()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const normalized = this.extractUsers(response);
          this.users.set(normalized);
          this.dataSource.data = normalized;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al cargar usuarios:', err);
          this.snackBar.open(
            'No fue posible obtener la lista de usuarios (puerto 8000).',
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
   * Abre el modal en modo Creación con contraseña obligatoria.
   */
  openCreateDialog(): void {
    this.editingUser.set(null);
    this.hidePassword.set(true);

    this.userForm.reset({
      name: '',
      email: '',
      role: 'customer',
      password: ''
    });
    this.userForm.controls.password.setValidators([
      Validators.required,
      Validators.minLength(6)
    ]);
    this.userForm.controls.password.updateValueAndValidity();

    const tpl = this.userDialogTemplate();
    if (tpl) {
      this.activeDialogRef = this.dialog.open(tpl, {
        width: '480px',
        maxWidth: '95vw',
        disableClose: true
      });
    }
  }

  /**
   * Abre el modal en modo Edición precargando los datos del usuario seleccionado.
   */
  openEditDialog(user: AdminUser): void {
    this.editingUser.set(user);
    this.hidePassword.set(true);

    this.userForm.reset({
      name: user.name,
      email: user.email,
      role: this.normalizeRoleValue(user.role),
      password: ''
    });
    this.userForm.controls.password.setValidators([Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();

    const tpl = this.userDialogTemplate();
    if (tpl) {
      this.activeDialogRef = this.dialog.open(tpl, {
        width: '480px',
        maxWidth: '95vw',
        disableClose: true
      });
    }
  }

  /**
   * Guarda los cambios creando o actualizando el usuario en el microservicio (puerto 8000).
   */
  saveUser(): void {
    if (this.userForm.invalid || this.isSaving()) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.getRawValue();
    const currentEditing = this.editingUser();
    this.isSaving.set(true);

    if (currentEditing) {
      const updatePayload: UpdateUserPayload = {
        name: raw.name.trim(),
        email: raw.email.trim(),
        role: raw.role,
        ...(raw.password.trim() ? { password: raw.password.trim() } : {})
      };

      this.userService
        .updateUser(currentEditing.id, updatePayload)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (res) => {
            const updatedList = this.users().map((u) =>
              u.id === currentEditing.id
                ? { ...u, name: updatePayload.name, email: updatePayload.email, role: updatePayload.role }
                : u
            );
            this.users.set(updatedList);
            this.dataSource.data = updatedList;
            this.closeDialog();
            this.snackBar.open(res?.message || 'Usuario actualizado correctamente.', 'Cerrar', {
              duration: 3500
            });
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error al actualizar usuario:', err);
            this.snackBar.open('Error al actualizar el usuario.', 'Cerrar', { duration: 4000 });
          }
        });
    } else {
      const createPayload: CreateUserPayload = {
        name: raw.name.trim(),
        email: raw.email.trim(),
        role: raw.role,
        password: raw.password.trim()
      };

      this.userService
        .createUser(createPayload)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (res) => {
            const createdUser: AdminUser = res?.data ?? res?.user ?? {
              id: Date.now(),
              name: createPayload.name,
              email: createPayload.email,
              role: createPayload.role
            };
            const updatedList = [createdUser, ...this.users()];
            this.users.set(updatedList);
            this.dataSource.data = updatedList;
            this.closeDialog();
            this.snackBar.open(res?.message || 'Usuario creado exitosamente.', 'Cerrar', {
              duration: 3500
            });
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error al crear usuario:', err);
            this.snackBar.open('No se pudo crear el usuario. Verifique los datos.', 'Cerrar', {
              duration: 4000
            });
          }
        });
    }
  }

  /**
   * Abre el diálogo de confirmación antes de eliminar un usuario.
   */
  openDeleteConfirm(user: AdminUser): void {
    this.userToDelete.set(user);
    const tpl = this.deleteConfirmTemplate();
    if (tpl) {
      this.activeDialogRef = this.dialog.open(tpl, {
        width: '420px',
        maxWidth: '95vw'
      });
    }
  }

  /**
   * Ejecuta DELETE http://127.0.0.1:8000/api/users/:id tras confirmar.
   */
  confirmDeleteUser(): void {
    const target = this.userToDelete();
    if (!target || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.userService
      .deleteUser(target.id)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          const remaining = this.users().filter((u) => u.id !== target.id);
          this.users.set(remaining);
          this.dataSource.data = remaining;
          this.closeDialog();
          this.snackBar.open(res?.message || 'Usuario eliminado correctamente.', 'Cerrar', {
            duration: 3500
          });
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al eliminar usuario:', err);
          this.snackBar.open('No fue posible eliminar el usuario.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  closeDialog(): void {
    this.activeDialogRef?.close();
    this.activeDialogRef = null;
    this.editingUser.set(null);
    this.userToDelete.set(null);
  }

  getRoleLabel(rawRole: string | null | undefined): string {
    const normalized = this.normalizeText(rawRole ?? '');
    if (normalized.includes('admin')) {
      return 'Administrador';
    }
    if (normalized.includes('support') || normalized.includes('soporte') || normalized.includes('tecnico')) {
      return 'Soporte TI';
    }
    return 'Cliente';
  }

  getRoleChipClass(rawRole: string | null | undefined): RoleChipVariant {
    const normalized = this.normalizeText(rawRole ?? '');
    if (normalized.includes('admin')) {
      return 'role--admin';
    }
    if (normalized.includes('support') || normalized.includes('soporte') || normalized.includes('tecnico')) {
      return 'role--support';
    }
    return 'role--customer';
  }

  private normalizeRoleValue(rawRole: string | null | undefined): string {
    const normalized = this.normalizeText(rawRole ?? '');
    if (normalized.includes('admin')) {
      return 'admin';
    }
    if (normalized.includes('support') || normalized.includes('soporte') || normalized.includes('tecnico')) {
      return 'support';
    }
    return 'customer';
  }

  private configureFilterPredicate(): void {
    this.dataSource.filterPredicate = (user: AdminUser, filter: string): boolean => {
      const searchable = this.normalizeText(
        `${user.id} ${user.name} ${user.email} ${user.role} ${this.getRoleLabel(user.role)}`
      );
      return searchable.includes(filter);
    };
  }

  private extractUsers(response: UsersApiResponse | AdminUser[]): AdminUser[] {
    let rawList: unknown[] = [];

    if (Array.isArray(response)) {
      rawList = response;
    } else if (Array.isArray(response?.data)) {
      rawList = response.data;
    } else if (response?.data && typeof response.data === 'object') {
      rawList = response.data.data ?? response.data.users ?? [];
    } else if (Array.isArray(response?.users)) {
      rawList = response.users;
    }

    return rawList.map((entry, idx) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        id: (record['id'] as number | string) ?? idx + 1,
        name: String(record['name'] ?? record['nombre'] ?? 'Sin nombre'),
        email: String(record['email'] ?? record['correo'] ?? ''),
        role: String(record['role'] ?? record['rol'] ?? 'customer'),
        status: String(record['status'] ?? 'Activo')
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
