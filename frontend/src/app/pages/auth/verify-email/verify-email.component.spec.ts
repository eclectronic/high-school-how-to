import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { VerifyEmailComponent } from './verify-email.component';
import { VerificationResponse } from '../../../core/models/auth.models';

const buildRoute = (token?: string) => ({
  queryParamMap: of(convertToParamMap(token ? { token } : {}))
});

// Validates verification success, missing-token handling, and error fallback messaging.
describe('VerifyEmailComponent', () => {
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let component: VerifyEmailComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;

  const setup = async (token?: string, verifyReturn?: Observable<VerificationResponse>) => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['verifyEmail']);
    if (verifyReturn) {
      authApi.verifyEmail.and.returnValue(verifyReturn);
    }

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent, RouterTestingModule],
      providers: [
        { provide: AuthApiService, useValue: authApi },
        { provide: ActivatedRoute, useValue: buildRoute(token) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('verifies email with token', async () => {
    await setup('token123', of({ message: 'All set' }));

    expect(authApi.verifyEmail).toHaveBeenCalledWith('token123');
    expect(component['status']()).toBe('success');
    expect(component['message']()).toContain('All set');
  });

  it('handles missing token', async () => {
    await setup();

    expect(component['status']()).toBe('error');
    expect(component['message']()).toContain('Verification link missing');
  });

  it('handles error response', async () => {
    await setup('token123', throwError(() => new Error('fail')) as Observable<VerificationResponse>);

    expect(component['status']()).toBe('error');
    expect(component['message']()).toContain('invalid or expired');
  });
});
