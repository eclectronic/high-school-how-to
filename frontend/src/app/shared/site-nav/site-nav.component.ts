import { Component, Input, OnInit, inject, signal, HostListener } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionStore } from '../../core/session/session.store';
import { LockerColorStore } from '../../core/locker-color.store';
import { SocialLinksApiService } from '../../core/services/social-links-api.service';
import { EditModeToggleComponent } from '../edit-mode-toggle/edit-mode-toggle.component';

@Component({
  selector: 'app-site-nav',
  standalone: true,
  imports: [RouterLink, EditModeToggleComponent],
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.scss',
})
export class SiteNavComponent implements OnInit {
  private readonly sessionStore = inject(SessionStore);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  protected readonly socialLinksApi = inject(SocialLinksApiService);

  protected readonly lockerColor = inject(LockerColorStore).color;
  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;
  protected readonly avatarUrl = this.sessionStore.avatarUrl;
  protected readonly firstName = this.sessionStore.firstName;

  protected readonly drawerOpen = signal(false);
  protected readonly socialsOpen = signal(false);
  protected readonly drawerSocialsOpen = signal(false);

  @Input() activeRoute?: string;

  ngOnInit(): void {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.drawerOpen.set(false);
      this.socialsOpen.set(false);
      this.drawerSocialsOpen.set(false);
    });
  }

  protected get socialLinks() {
    return this.socialLinksApi.links();
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
    if (!this.drawerOpen()) this.drawerSocialsOpen.set(false);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerSocialsOpen.set(false);
  }

  protected toggleSocials(): void {
    this.socialsOpen.update((v) => !v);
  }

  protected toggleDrawerSocials(): void {
    this.drawerSocialsOpen.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.drawerOpen.set(false);
    this.socialsOpen.set(false);
    this.drawerSocialsOpen.set(false);
  }

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

  protected platformIcon(platform: string): string {
    switch (platform.toUpperCase()) {
      case 'INSTAGRAM':
        return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;
      case 'YOUTUBE':
        return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
      case 'TIKTOK':
        return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.77a4.85 4.85 0 01-1.02-.08z"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>`;
    }
  }
}
