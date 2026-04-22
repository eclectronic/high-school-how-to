import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { SessionStore } from '../../../core/session/session.store';
import { GoogleButtonComponent } from '../google-button/google-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GoogleButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly nonce = crypto.randomUUID();

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  constructor() {
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

  protected onGoogleIdToken(idToken: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authApi
      .googleSignIn({ idToken, nonce: this.nonce, rememberMe: this.form.getRawValue().rememberMe })
      .pipe(takeUntilDestroyed(this.destroyRef), timeout(15000), finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.sessionStore.setSession(response);
          this.router.navigateByUrl(this.returnUrl());
        },
        error: err => this.error.set(this.humanizeError(err))
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.authApi
      .login(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout(15000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: response => {
          this.sessionStore.setSession(response);
          this.router.navigateByUrl(this.returnUrl());
        },
        error: error => {
          this.error.set(this.humanizeError(error));
        }
      });
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/locker';
  }

  private humanizeError(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'Login is taking too long. Check your connection and try again.';
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'We could not match that email/password. Try again.';
      }
      if (error.status >= 500) {
        return 'The server had a hiccup. Try again in a few seconds.';
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
