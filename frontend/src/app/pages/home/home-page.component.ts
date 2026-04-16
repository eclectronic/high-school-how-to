import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/session/session.store';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { Quote } from '../../core/models/task.models';

const POSTIT_PALETTE = [
  '#fff176', // yellow
  '#ffcc80', // orange
  '#f48fb1', // pink
  '#ce93d8', // purple
  '#80deea', // cyan
  '#a5d6a7', // green
  '#90caf9', // blue
  '#ffab91', // coral
  '#b0bec5', // slate
  '#fff59d', // pale yellow
];

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

  /** Random offset rotates which post-it color each card gets on every page load. */
  private readonly paletteOffset = Math.floor(Math.random() * POSTIT_PALETTE.length);

  protected cardColor(index: number): string {
    return POSTIT_PALETTE[(index + this.paletteOffset) % POSTIT_PALETTE.length];
  }

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
