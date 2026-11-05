import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Enlace2Component } from './enlace2.component';

describe('Enlace2Component', () => {
  let component: Enlace2Component;
  let fixture: ComponentFixture<Enlace2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Enlace2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(Enlace2Component);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
