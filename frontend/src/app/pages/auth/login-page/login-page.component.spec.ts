import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginPageComponent, extractProblemDetail } from './login-page.component';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { SessionStore } from '../../../core/session/session.store';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let authApiSpy: jasmine.SpyObj<AuthApiService>;
  let sessionStoreSpy: jasmine.SpyObj<SessionStore>;

  beforeEach(async () => {
    authApiSpy = jasmine.createSpyObj('AuthApiService', ['login', 'register', 'forgotPassword', 'googleSignIn']);
    sessionStoreSpy = jasmine.createSpyObj('SessionStore', ['setSession']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, RouterTestingModule],
      providers: [
        { provide: AuthApiService, useValue: authApiSpy },
        { provide: SessionStore, useValue: sessionStoreSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { url: [], queryParamMap: { get: () => null } } },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initial state is signin', () => {
    expect(component['mode']()).toBe('signin');
  });

  it('setMode switches to signup', () => {
    component['setMode']('signup');
    expect(component['mode']()).toBe('signup');
  });

  it('setMode switches to forgot', () => {
    component['setMode']('forgot');
    expect(component['mode']()).toBe('forgot');
  });

  it('setMode clears error', () => {
    component['error'].set('some error');
    component['setMode']('signup');
    expect(component['error']()).toBeNull();
  });

  it('rememberMe persists when toggling between signin and signup modes', () => {
    component['rememberMe'].setValue(true);
    component['setMode']('signup');
    expect(component['rememberMe'].value).toBeTrue();
    component['setMode']('signin');
    expect(component['rememberMe'].value).toBeTrue();
  });

  it('Google button is present in signin mode', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-google-button')).toBeTruthy();
  });

  it('Google button is absent in forgot mode', () => {
    component['setMode']('forgot');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-google-button')).toBeNull();
  });

  it('submitSignin calls authApi.login with rememberMe', fakeAsync(() => {
    const mockResponse = { accessToken: 'tok', refreshToken: 'ref' } as any;
    authApiSpy.login.and.returnValue(of(mockResponse));
    component['signinForm'].setValue({ email: 'test@test.com', password: 'password123' });
    component['rememberMe'].setValue(true);
    component['submitSignin']();
    tick(100);
    expect(authApiSpy.login).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
      rememberMe: true,
    });
  }));

  it('submitSignup calls authApi.register and shows confirmation', fakeAsync(() => {
    authApiSpy.register.and.returnValue(of(new HttpResponse<void>({ status: 200 })));
    component['setMode']('signup');
    component['signupForm'].setValue({ firstName: 'J', lastName: 'D', email: 'j@test.com', password: 'password1234' });
    component['submitSignup']();
    tick(100);
    expect(authApiSpy.register).toHaveBeenCalled();
    expect(component['registerComplete']()).toBeTrue();
  }));

  it('submitSignup shows error on 409', fakeAsync(() => {
    authApiSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component['setMode']('signup');
    component['signupForm'].setValue({ firstName: 'J', lastName: 'D', email: 'j@test.com', password: 'password1234' });
    component['submitSignup']();
    tick(100);
    expect(component['error']()).toContain('already registered');
  }));

  it('submitForgot calls authApi.forgotPassword and shows confirmation', fakeAsync(() => {
    authApiSpy.forgotPassword.and.returnValue(of(new HttpResponse<void>({ status: 200 })));
    component['setMode']('forgot');
    component['forgotForm'].setValue({ email: 'test@test.com' });
    component['submitForgot']();
    tick(100);
    expect(authApiSpy.forgotPassword).toHaveBeenCalled();
    expect(component['forgotSent']()).toBeTrue();
  }));

  it('onGoogleIdToken passes rememberMe value', fakeAsync(() => {
    const mockResponse = { accessToken: 'tok', refreshToken: 'ref' } as any;
    authApiSpy.googleSignIn.and.returnValue(of(mockResponse));
    component['rememberMe'].setValue(true);
    component['onGoogleIdToken']('fake-id-token');
    tick(100);
    expect(authApiSpy.googleSignIn).toHaveBeenCalledWith(jasmine.objectContaining({ rememberMe: true }));
  }));

  it('signup form rejects 10-char password with no digit', () => {
    component['signupForm'].setValue({ firstName: 'A', lastName: 'B', email: 'x@x.com', password: 'abcdefghij' });
    expect(component['signupForm'].valid).toBeFalse();
    expect(component['signupForm'].controls.password.errors?.['pattern']).toBeTruthy();
  });

  it('signup form accepts 10-char password that includes a digit', () => {
    component['signupForm'].setValue({ firstName: 'A', lastName: 'B', email: 'x@x.com', password: 'password12' });
    expect(component['signupForm'].valid).toBeTrue();
  });

  it('submitSignup surfaces backend ProblemDetails.detail on 400', fakeAsync(() => {
    // This is the regression for the bug where a 4xx (other than 409) fell through
    // to a generic "We could not submit your signup" instead of showing the
    // specific server-side reason. Mai's signup hit this exact path.
    const problemBody = {
      type: 'about:blank',
      title: 'Password does not meet requirements',
      status: 400,
      detail: 'Password must be at least 10 characters long. Password must include a number.',
      traceId: 'abc',
      violations: [],
    };
    authApiSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: problemBody })));
    component['setMode']('signup');
    component['signupForm'].setValue({ firstName: 'J', lastName: 'D', email: 'j@test.com', password: 'password1234' });
    component['submitSignup']();
    tick(100);
    expect(component['error']()).toBe(problemBody.detail);
  }));
});

describe('extractProblemDetail', () => {
  it('returns null when there is no body', () => {
    expect(extractProblemDetail(new HttpErrorResponse({ status: 400 }))).toBeNull();
  });

  it('prefers violations.message over detail when present', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'fallback', violations: [{ field: 'password', message: 'specific' }] },
    });
    expect(extractProblemDetail(error)).toBe('specific');
  });

  it('joins multiple violation messages with a space', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { violations: [{ message: 'one.' }, { message: 'two.' }] },
    });
    expect(extractProblemDetail(error)).toBe('one. two.');
  });

  it('falls back to detail when violations is empty', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'fallback', violations: [] },
    });
    expect(extractProblemDetail(error)).toBe('fallback');
  });
});
