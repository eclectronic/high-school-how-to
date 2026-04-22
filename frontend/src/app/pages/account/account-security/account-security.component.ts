import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { UserProfile } from '../../../core/models/auth.models';
import { SiteNavComponent } from '../../../shared/site-nav/site-nav.component';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SiteNavComponent],
  templateUrl: './account-security.component.html',
  styleUrl: './account-security.component.scss'
})
export class AccountSecurityComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly profileError = signal<string | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(10)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: control => this.matchPasswords(control) }
  );

  ngOnInit(): void {
    this.authApi.getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => this.profile.set(p),
        error: () => this.profileError.set('Could not load account information.'),
      });
  }

  protected get displayName(): string {
    const p = this.profile();
    if (!p) return '';
    const full = [p.firstName, p.lastName].filter(Boolean).join(' ');
    return full || p.email;
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.authApi
      .updatePassword({
        currentPassword: this.form.controls.currentPassword.value,
        newPassword: this.form.controls.newPassword.value
      })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.success.set('Password updated successfully.');
          this.form.reset();
        },
        error: () => {
          this.error.set('We could not update your password. Check your current password and try again.');
        }
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
