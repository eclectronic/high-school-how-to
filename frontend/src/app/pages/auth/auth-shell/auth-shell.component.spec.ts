import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthShellComponent } from './auth-shell.component';

// Confirms the auth shell renders with router outlets available.

describe('AuthShellComponent', () => {
  let fixture: ComponentFixture<AuthShellComponent>;
  let component: AuthShellComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthShellComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });
});
