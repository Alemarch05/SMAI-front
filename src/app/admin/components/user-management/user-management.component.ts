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

export interface RoleOption {
  value: string;
  roleId: number;
  label: string;
}

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

  // Opciones compatibles con UserController en Laravel y roleGuard
  readonly roleOptions: readonly RoleOption[] = [
    { value: 'admin', roleId: 1, label: 'Administrador' },
    { value: 'soporte', roleId: 2, label: 'Soporte TI' },
    { value: 'cliente', roleId: 3, label: 'Cliente' }
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

  // Formulario reactivo alineado con UserController (name, email, role, password)
  readonly userForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    role: this.fb.nonNullable.control('user', [Validators.required]),
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
          const msg = this.extractBackendError(
            err,
            'No fue posible obtener la lista de usuarios (puerto 8000).'
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

  clearSearch(): void {
    this.searchTerm.set('');
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Abre el modal en modo Creación (contraseña obligatoria).
   */
  openCreateDialog(): void {
    this.editingUser.set(null);
    this.hidePassword.set(true);

    const defaultRole = this.detectPreferredCustomerRole();
    this.userForm.reset({
      name: '',
      email: '',
      role: defaultRole,
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
   * Abre el modal en modo Edición (contraseña opcional si se deja en blanco).
   */
  openEditDialog(user: AdminUser): void {
    this.editingUser.set(user);
    this.hidePassword.set(true);

    this.userForm.reset({
      name: user.name,
      email: user.email,
      role: this.normalizeRoleValue(user.role, user.role_id),
      password: ''
    });
    // Al editar, la contraseña NO es obligatoria si se deja vacía
    this.userForm.controls.password.clearValidators();
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
   * Crea o actualiza el usuario enviando los campos exactos esperados por UserController en Laravel.
   */
  saveUser(): void {
    if (this.userForm.invalid || this.isSaving()) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.getRawValue();
    const currentEditing = this.editingUser();
    const trimmedPassword = raw.password.trim();
    const mappedRoleId = this.resolveRoleId(raw.role);

    this.isSaving.set(true);

    if (currentEditing) {
      // Al editar: si la contraseña está en blanco, NO se envía en el JSON
      const updatePayload: UpdateUserPayload = {
        name: raw.name.trim(),
        email: raw.email.trim(),
        role: raw.role,
        role_id: mappedRoleId,
        ...(trimmedPassword.length > 0
          ? {
              password: trimmedPassword,
              password_confirmation: trimmedPassword
            }
          : {})
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
                ? {
                    ...u,
                    name: updatePayload.name,
                    email: updatePayload.email,
                    role: updatePayload.role,
                    role_id: mappedRoleId
                  }
                : u
            );
            this.users.set(updatedList);
            this.dataSource.data = updatedList;
            this.closeDialog();
            this.snackBar.open(
              res?.message || 'Usuario actualizado correctamente.',
              'Cerrar',
              { duration: 3500 }
            );
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error al actualizar usuario:', err);
            const msg = this.extractBackendError(err, 'Error al actualizar el usuario.');
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      const createPayload: CreateUserPayload = {
        name: raw.name.trim(),
        email: raw.email.trim(),
        password: trimmedPassword,
        password_confirmation: trimmedPassword,
        role: raw.role,
        role_id: mappedRoleId
      };

      this.userService
        .createUser(createPayload)
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (res) => {
            const createdUser: AdminUser = res?.data ??
              res?.user ?? {
                id: Date.now(),
                name: createPayload.name,
                email: createPayload.email,
                role: createPayload.role,
                role_id: mappedRoleId
              };
            const updatedList = [createdUser, ...this.users()];
            this.users.set(updatedList);
            this.dataSource.data = updatedList;
            this.closeDialog();
            this.snackBar.open(
              res?.message || 'Usuario creado exitosamente.',
              'Cerrar',
              { duration: 3500 }
            );
          },
          error: (err: HttpErrorResponse) => {
            console.error('Error al crear usuario:', err);
            const msg = this.extractBackendError(
              err,
              'No se pudo crear el usuario. Verifique los datos ingresados.'
            );
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
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
          this.snackBar.open(
            res?.message || 'Usuario eliminado correctamente.',
            'Cerrar',
            { duration: 3500 }
          );
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error al eliminar usuario:', err);
          const msg = this.extractBackendError(err, 'No fue posible eliminar el usuario.');
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  closeDialog(): void {
    this.activeDialogRef?.close();
    this.activeDialogRef = null;
    this.editingUser.set(null);
    this.userToDelete.set(null);
  }

  getRoleLabel(rawRole: string | null | undefined, roleId?: number): string {
    const normalized = this.normalizeText(rawRole ?? '');
    if (roleId === 1 || normalized.includes('admin')) {
      return 'Administrador';
    }
    if (
      roleId === 2 ||
      normalized.includes('support') ||
      normalized.includes('soporte') ||
      normalized.includes('tecnico')
    ) {
      return 'Soporte TI';
    }
    return 'Usuario / Cliente';
  }

  getRoleChipClass(rawRole: string | null | undefined, roleId?: number): RoleChipVariant {
    const normalized = this.normalizeText(rawRole ?? '');
    if (roleId === 1 || normalized.includes('admin')) {
      return 'role--admin';
    }
    if (
      roleId === 2 ||
      normalized.includes('support') ||
      normalized.includes('soporte') ||
      normalized.includes('tecnico')
    ) {
      return 'role--support';
    }
    return 'role--customer';
  }

  private resolveRoleId(roleValue: string): number {
    const normalized = this.normalizeText(roleValue);
    if (normalized.includes('admin') || normalized === '1') {
      return 1;
    }
    if (
      normalized.includes('support') ||
      normalized.includes('soporte') ||
      normalized.includes('tecnico') ||
      normalized === '2'
    ) {
      return 2;
    }
    return 3;
  }

  private normalizeRoleValue(rawRole: string | null | undefined, roleId?: number): string {
    const normalized = this.normalizeText(rawRole ?? '');
    if (roleId === 1 || normalized.includes('admin')) {
      return 'admin';
    }
    if (
      roleId === 2 ||
      normalized.includes('support') ||
      normalized.includes('soporte') ||
      normalized.includes('tecnico')
    ) {
      return 'soporte';
    }
    return this.detectPreferredCustomerRole();
  }

  private detectPreferredCustomerRole(): string {
    const existingCustomer = this.users().find(
      (u) => this.getRoleChipClass(u.role, u.role_id) === 'role--customer'
    );
    if (existingCustomer && existingCustomer.role) {
      const lower = existingCustomer.role.toLowerCase();
      if (['cliente', 'user', 'customer', 'usuario'].includes(lower)) {
        return lower;
      }
    }
    return 'cliente';
  }

  /**
   * Extrae el mensaje de error real devuelto por Laravel (errors o message).
   */
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
      return 'Sin conexión con user-service (puerto 8000). Verifique que el backend esté activo.';
    }

    return fallback;
  }

  private configureFilterPredicate(): void {
    this.dataSource.filterPredicate = (user: AdminUser, filter: string): boolean => {
      const searchable = this.normalizeText(
        `${user.id} ${user.name} ${user.email} ${user.role} ${this.getRoleLabel(user.role, user.role_id)}`
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
      const rawRoleField = record['role'] ?? record['rol'];
      const rawRoleId = record['role_id'] ? Number(record['role_id']) : undefined;

      let resolvedRole = 'user';
      let resolvedRoleId = rawRoleId;

      if (rawRoleField && typeof rawRoleField === 'object') {
        const roleObj = rawRoleField as Record<string, unknown>;
        resolvedRole = String(roleObj['slug'] ?? roleObj['name'] ?? 'user');
        if (roleObj['id']) {
          resolvedRoleId = Number(roleObj['id']);
        }
      } else if (rawRoleField !== undefined && rawRoleField !== null) {
        resolvedRole = String(rawRoleField);
      } else if (resolvedRoleId === 1) {
        resolvedRole = 'admin';
      } else if (resolvedRoleId === 2) {
        resolvedRole = 'support';
      }

      return {
        id: (record['id'] as number | string) ?? idx + 1,
        name: String(record['name'] ?? record['nombre'] ?? 'Sin nombre'),
        email: String(record['email'] ?? record['correo'] ?? ''),
        role: resolvedRole,
        role_id: resolvedRoleId,
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
