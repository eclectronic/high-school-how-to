import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ForgotPasswordComponent } from './forgot-password.component';

// Verifies forgot-password submission marks success regardless of API outcome.
describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['forgotPassword']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, RouterTestingModule],
      providers: [{ provide: AuthApiService, useValue: authApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends reset email and marks sent on success', () => {
    authApi.forgotPassword.and.returnValue(of(new HttpResponse<void>({ status: 200 })));
    component['form'].setValue({ email: 'user@example.com' });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(authApi.forgotPassword).toHaveBeenCalled();
    expect(component['sent']()).toBeTrue();
  });

  it('still marks sent when API errors', () => {
    authApi.forgotPassword.and.returnValue(throwError(() => new Error('fail')));
    component['form'].setValue({ email: 'user@example.com' });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(component['sent']()).toBeTrue();
  });
});
