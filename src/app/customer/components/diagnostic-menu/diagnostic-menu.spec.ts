import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagnosticMenu } from './diagnostic-menu';

describe('DiagnosticMenu', () => {
  let component: DiagnosticMenu;
  let fixture: ComponentFixture<DiagnosticMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagnosticMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(DiagnosticMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
