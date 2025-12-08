import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { ResetPasswordComponent } from './reset-password.component';

const buildRoute = (token?: string) => ({
  queryParamMap: of(convertToParamMap(token ? { token } : {}))
});

// Checks token-driven reset submission and the missing-token error path.
describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;

  const setup = async (token?: string) => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, RouterLink, RouterTestingModule],
      providers: [
        { provide: AuthApiService, useValue: authApi },
        { provide: ActivatedRoute, useValue: buildRoute(token) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('submits reset when token present', async () => {
    await setup('token123');
    authApi.resetPassword.and.returnValue(of(new HttpResponse<void>({ status: 200 })));
    component['form'].setValue({ newPassword: 'longpasswordhere', confirmPassword: 'longpasswordhere' });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: 'token123',
      newPassword: 'longpasswordhere'
    });
    expect(component['complete']()).toBeTrue();
  });

  it('shows error when token is missing', async () => {
    await setup(undefined);
    component['form'].setValue({ newPassword: 'longpasswordhere', confirmPassword: 'longpasswordhere' });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(component['error']()).toContain('Reset token missing');
  });
});
