import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;

  @Input() activeRoute?: string;

  protected logout(): void {
    this.sessionStore.clearSession();
    this.router.navigate(['/']);
  }
}
