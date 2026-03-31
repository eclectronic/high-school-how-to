import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly complete = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]]
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.authApi
      .register(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout(15000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.complete.set(true);
        },
        error: error => {
          this.error.set(this.humanizeError(error));
        }
      });
  }

  private humanizeError(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'Signup is taking too long. Check your connection and try again.';
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return 'That email is already registered. Try logging in.';
      }
      if (error.status >= 500) {
        return 'The server had a hiccup. Try again shortly.';
      }
    }
    return 'We could not submit your signup. Please try again.';
  }
}
