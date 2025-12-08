import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { SessionStore } from '../../../core/session/session.store';
import { LoginComponent } from './login.component';

// Exercises login success path (session + navigation) and friendly error messaging.
describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authApi: jasmine.SpyObj<AuthApiService>;
  let sessionStore: jasmine.SpyObj<SessionStore>;
  let router: Router;

  const buildActivatedRouteStub = (returnUrl?: string) => ({
    snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) }
  });

  const createComponent = async (returnUrl?: string) => {
    authApi = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['login']);
    sessionStore = jasmine.createSpyObj<SessionStore>('SessionStore', ['setSession']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthApiService, useValue: authApi },
        { provide: SessionStore, useValue: sessionStore },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub(returnUrl) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.stub();
    fixture.detectChanges();
  };

  it('logs in and navigates to return url', async () => {
    await createComponent('/account/security');

    authApi.login.and.returnValue(of({ accessToken: 'a', refreshToken: 'r', expiresIn: 10 }));

    component['form'].setValue({ email: 'user@example.com', password: 'secret' });
    TestBed.runInInjectionContext(() => component['submit']());

    expect(authApi.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' });
    expect(sessionStore.setSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/account/security');
  });

  it('shows friendly message on 401', async () => {
    await createComponent();

    authApi.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }))
    );

    component['form'].setValue({ email: 'user@example.com', password: 'wrong' });
    TestBed.runInInjectionContext(() => component['submit']());

    expect(component['error']()).toContain('email/password');
  });
});
