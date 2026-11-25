import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/users');
    req.flush([
      { id: 1, name: 'Santiago Admin', email: 'santiago@smai.com', role: 'admin', role_id: 1 },
      { id: 2, name: 'Agente Soporte', email: 'soporte@smai.com', role: 'soporte', role_id: 2 }
    ]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load users into MatTableDataSource', () => {
    expect(component).toBeTruthy();
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should update a user omitting password when left blank', () => {
    component.editingUser.set({
      id: 1,
      name: 'Santiago Admin',
      email: 'santiago@smai.com',
      role: 'admin',
      role_id: 1
    });
    component.userForm.setValue({
      name: 'Santiago Cárdenas',
      email: 'santiago@smai.com',
      role: 'admin',
      password: ''
    });

    component.saveUser();

    const putReq = httpMock.expectOne('http://127.0.0.1:8000/api/users/1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      name: 'Santiago Cárdenas',
      email: 'santiago@smai.com',
      role: 'admin',
      role_id: 1
    });
    expect(putReq.request.body.password).toBeUndefined();
    putReq.flush({ success: true, message: 'Actualizado' });

    expect(component.users()[0].name).toBe('Santiago Cárdenas');
  });

  it('should delete user after confirmation', () => {
    component.userToDelete.set({
      id: 2,
      name: 'Agente Soporte',
      email: 'soporte@smai.com',
      role: 'soporte',
      role_id: 2
    });

    component.confirmDeleteUser();

    const delReq = httpMock.expectOne('http://127.0.0.1:8000/api/users/2');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true });

    expect(component.users().length).toBe(1);
  });
});
