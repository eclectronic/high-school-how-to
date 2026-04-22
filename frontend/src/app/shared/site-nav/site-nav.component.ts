import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionStore } from '../../core/session/session.store';

@Component({
  selector: 'app-site-nav',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.scss',
})
export class SiteNavComponent {
  private readonly sessionStore = inject(SessionStore);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;
  protected readonly avatarUrl = this.sessionStore.avatarUrl;
  protected readonly firstName = this.sessionStore.firstName;

  @Input() activeRoute?: string;

  protected logout(): void {
    const refreshToken = this.sessionStore.getRefreshToken();
    // Fire the API call BEFORE clearing local state so the interceptor attaches the Bearer token.
    // Fire-and-forget: clear local session and navigate regardless of the outcome.
    if (refreshToken) {
      this.authApi.logout({ refreshToken }).subscribe({ error: () => {} });
    }
    this.sessionStore.clearSession();
    this.router.navigate(['/']);
  }
}
