import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/session/session.store';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { Quote } from '../../core/models/task.models';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, SiteNavComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly quoteApi = inject(QuoteApiService);

  protected readonly quote = signal<Quote | null>(null);

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;

  ngOnInit(): void {
    this.quoteApi.getTodayQuote().subscribe({
      next: q => this.quote.set(q),
      error: () => {},
    });
  }

  protected handleAuthCta(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/locker']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  protected handleLogout(): void {
    this.sessionStore.clearSession();
    this.router.navigate(['/']);
  }
}
