import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly complete = signal(false);
  protected readonly token = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: control => this.matchPasswords(control) }
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.token.set(params.get('token'));
    });
  }

  protected submit(): void {
    if (!this.token()) {
      this.error.set('Reset token missing. Start over from the forgot password link.');
      return;
    }
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.authApi
      .resetPassword({
        token: this.token()!,
        newPassword: this.form.controls.newPassword.value
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.complete.set(true),
        error: () => this.error.set('That link may have expired. Request a new one and try again.')
      });
  }

  protected passwordsDoNotMatch(): boolean {
    return this.form.errors?.['passwordMismatch'] && this.form.controls.confirmPassword.touched;
  }

  private matchPasswords(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (newPassword && confirm && newPassword !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }
}
