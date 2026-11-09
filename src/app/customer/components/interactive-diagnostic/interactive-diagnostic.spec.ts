import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InteractiveDiagnostic } from './interactive-diagnostic';

describe('InteractiveDiagnostic', () => {
  let component: InteractiveDiagnostic;
  let fixture: ComponentFixture<InteractiveDiagnostic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveDiagnostic]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InteractiveDiagnostic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
