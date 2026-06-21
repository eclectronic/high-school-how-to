import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { SessionStore } from '../../../core/session/session.store';
import { GoogleButtonComponent } from '../google-button/google-button.component';

type Mode = 'signin' | 'signup' | 'forgot';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, GoogleButtonComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly mode = signal<Mode>('signin');
  protected readonly registerComplete = signal(false);
  protected readonly forgotSent = signal(false);
  protected readonly nonce = crypto.randomUUID();

  protected readonly rememberMe = this.fb.nonNullable.control(false);

  protected readonly signinForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly signupForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/.*\d.*/)]],
  });

  protected readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    if (this.route.snapshot.url?.[0]?.path === 'signup') {
      this.mode.set('signup');
    }

    const verified = this.route.snapshot.queryParamMap.get('verified');
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (verified === 'success') {
      this.info.set('Thanks! Your email is verified. You can log in now.');
    } else if (verified === 'error') {
      this.info.set('That verification link was invalid or expired. Request a new one.');
    } else if (reason === 'expired') {
      this.info.set('Your session timed out. Please sign in again to continue.');
    }
  }

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.info.set(null);
    const path = mode === 'signup' ? '/auth/signup' : '/auth/login';
    this.router.navigate([path], { replaceUrl: true });
  }

  protected onGoogleIdToken(idToken: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authApi
      .googleSignIn({ idToken, nonce: this.nonce, rememberMe: this.rememberMe.value })
      .pipe(takeUntilDestroyed(this.destroyRef), timeout(15000), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.sessionStore.setSession(response);
          this.router.navigateByUrl(this.returnUrl());
        },
        error: (err) => this.error.set(this.humanizeGoogleError(err)),
      });
  }

  protected submitSignin(): void {
    if (this.signinForm.invalid || this.loading()) {
      this.signinForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.signinForm.getRawValue();
    this.authApi
      .login({ email, password, rememberMe: this.rememberMe.value })
      .pipe(takeUntilDestroyed(this.destroyRef), timeout(15000), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.sessionStore.setSession(response);
          this.router.navigateByUrl(this.returnUrl());
        },
        error: (err) => this.error.set(this.humanizeLoginError(err)),
      });
  }

  protected submitSignup(): void {
    if (this.signupForm.invalid || this.loading()) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { firstName, lastName, email, password } = this.signupForm.getRawValue();
    this.authApi
      .register({ firstName, lastName, email, password })
      .pipe(takeUntilDestroyed(this.destroyRef), timeout(15000), finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.registerComplete.set(true),
        error: (err) => this.error.set(this.humanizeSignupError(err)),
      });
  }

  protected submitForgot(): void {
    if (this.forgotForm.invalid || this.loading()) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.authApi
      .forgotPassword(this.forgotForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.forgotSent.set(true),
        error: () => this.forgotSent.set(true),
      });
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  private humanizeLoginError(error: unknown): string {
    if (error instanceof TimeoutError) return 'Login is taking too long. Check your connection and try again.';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'We could not match that email/password. Try again.';
      if (error.status >= 500) return 'The server had a hiccup. Try again in a few seconds.';
    }
    return 'Something went wrong. Please try again.';
  }

  private humanizeSignupError(error: unknown): string {
    if (error instanceof TimeoutError) return 'Signup is taking too long. Check your connection and try again.';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return 'That email is already registered. Try logging in.';
      if (error.status >= 500) return 'The server had a hiccup. Try again shortly.';
      if (error.status === 400) {
        const detail = extractProblemDetail(error);
        if (detail) return detail;
      }
    }
    return 'We could not submit your signup. Please try again.';
  }

  private humanizeGoogleError(error: unknown): string {
    if (error instanceof TimeoutError) return 'Login is taking too long. Check your connection and try again.';
    if (error instanceof HttpErrorResponse) {
      if (error.status >= 500) return 'The server had a hiccup. Try again in a few seconds.';
    }
    return 'Something went wrong. Please try again.';
  }
}

// Pulls a user-readable message out of a Spring ProblemDetails body
// ({ detail, violations: [{ field, message }] }). Prefers violations
// when present (more specific), falls back to detail.
export function extractProblemDetail(error: HttpErrorResponse): string | null {
  const body = error.error as { detail?: string; violations?: { field?: string; message?: string }[] } | null;
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body.violations) && body.violations.length > 0) {
    const messages = body.violations.map(v => v.message).filter((m): m is string => !!m);
    if (messages.length > 0) return messages.join(' ');
  }
  return typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : null;
}
