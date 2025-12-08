import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfographicCardComponent } from './infographic-card.component';

// Smoke-tests card creation and ensures the select output emits.

describe('InfographicCardComponent', () => {
  let fixture: ComponentFixture<InfographicCardComponent>;
  let component: InfographicCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfographicCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InfographicCardComponent);
    component = fixture.componentInstance;
    component.slug = 'slug';
    component.title = 'Title';
    component.image = '/image.png';
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('emits select events', () => {
    const spy = jasmine.createSpy('select');
    component.select.subscribe(spy);

    component.select.emit();

    expect(spy).toHaveBeenCalled();
  });
});
