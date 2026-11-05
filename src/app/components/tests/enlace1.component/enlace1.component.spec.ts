import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Enlace1Component } from './enlace1.component';

describe('Enlace1Component', () => {
  let component: Enlace1Component;
  let fixture: ComponentFixture<Enlace1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Enlace1Component],
    }).compileComponents();

    fixture = TestBed.createComponent(Enlace1Component);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
