import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { AccountSecurityComponent } from './account-security.component';

// Ensures password update submits payload and sets success/error flags appropriately.
describe('AccountSecurityComponent', () => {
  let fixture: ComponentFixture<AccountSecurityComponent>;
  let component: AccountSecurityComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['updatePassword']);

    await TestBed.configureTestingModule({
      imports: [AccountSecurityComponent],
      providers: [{ provide: AuthApiService, useValue: authApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
