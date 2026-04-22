import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { UserProfile } from '../../../core/models/auth.models';
import { AccountSecurityComponent } from './account-security.component';

const stubProfile: UserProfile = {
  id: 'abc',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  googleLinked: false,
  hasPassword: true,
};

describe('AccountSecurityComponent', () => {
  let fixture: ComponentFixture<AccountSecurityComponent>;
  let component: AccountSecurityComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['getProfile', 'updatePassword']);
    authApi.getProfile.and.returnValue(of(stubProfile));

    await TestBed.configureTestingModule({
      imports: [AccountSecurityComponent, RouterTestingModule],
      providers: [
        { provide: AuthApiService, useValue: authApi },
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and displays profile on init', () => {
    expect(authApi.getProfile).toHaveBeenCalled();
    expect(component['profile']()?.email).toBe('test@example.com');
  });

  it('shows Google badge when googleLinked', () => {
    authApi.getProfile.and.returnValue(of({ ...stubProfile, googleLinked: true }));
    fixture = TestBed.createComponent(AccountSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component['profile']()?.googleLinked).toBeTrue();
  });

  it('updates password and resets form on success', () => {
    authApi.updatePassword.and.returnValue(of(new HttpResponse<void>({ status: 200 })));
    component['form'].setValue({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123'
    });

    TestBed.runInInjectionContext(() => component['submit']());

    expect(authApi.updatePassword).toHaveBeenCalledWith({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123'
    });
    expect(component['success']()).toContain('Password updated');
  });

  it('sets error message on failure', () => {
    authApi.updatePassword.and.returnValue(throwError(() => new Error('fail')));
    component['form'].setValue({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123'
    });

    TestBed.runInInjectionContext(() => component['submit']());
    expect(component['error']()).toContain('could not update');
  });
});
