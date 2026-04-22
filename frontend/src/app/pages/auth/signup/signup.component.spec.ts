import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { SignupComponent } from './signup.component';

// Covers happy-path registration completion and conflict error handling.
describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  let component: SignupComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;

  const createComponent = async () => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['register']);

    await TestBed.configureTestingModule({
      imports: [SignupComponent, RouterTestingModule],
      providers: [{ provide: AuthApiService, useValue: authApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('submits registration and marks complete', async () => {
    await createComponent();
    authApi.register.and.returnValue(of(new HttpResponse<void>({ status: 201 })));

    component['form'].setValue({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'longenoughpass',
      rememberMe: false,
    });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(authApi.register).toHaveBeenCalled();
    expect(component['complete']()).toBeTrue();
  });

  it('surfaces conflict errors', async () => {
    await createComponent();
    authApi.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' }))
    );

    component['form'].setValue({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'longenoughpass',
      rememberMe: false,
    });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(component['error']()).toContain('already registered');
  });
});
