import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../../core/services/auth-api.service';

type VerifyStatus = 'pending' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApiService);

  protected readonly status = signal<VerifyStatus>('pending');
  protected readonly message = signal('Verifying your email…');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const token = params.get('token');
      if (!token) {
        this.status.set('error');
        this.message.set('Verification link missing. Please open the link directly from your email.');
        return;
      }
      this.status.set('pending');
      this.message.set('Verifying your email…');
      this.authApi
        .verifyEmail(token)
        .pipe(
          takeUntilDestroyed(),
          finalize(() => {
            if (this.status() === 'pending') {
              this.status.set('error');
              this.message.set('Verification timed out. Try again.');
            }
          })
        )
        .subscribe({
          next: response => {
            this.status.set('success');
            this.message.set(response.message || 'Email verified! You can log in now.');
          },
          error: () => {
            this.status.set('error');
            this.message.set('That verification link may be invalid or expired.');
          }
        });
    });
  }
}
