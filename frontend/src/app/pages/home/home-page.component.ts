import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/session/session.store';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard, HomeLayoutResponse } from '../../core/models/content.models';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;

  protected layout = signal<HomeLayoutResponse | null>(null);
  protected loading = signal(true);
  protected selectedTagSlug = signal<string | null>(null);

  protected navTags = computed(() => this.layout()?.sections.map((s) => s.tag) ?? []);

  protected visibleSections = computed(() => {
    const sections = this.layout()?.sections ?? [];
    const slug = this.selectedTagSlug();
    return slug ? sections.filter((s) => s.tag.slug === slug) : sections;
  });

  ngOnInit(): void {
    this.api.getHomeLayout().subscribe({
      next: (layout) => {
        this.layout.set(layout);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectTag(slug: string | null): void {
    this.selectedTagSlug.set(slug);
  }

  protected handleAuthCta(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/account/locker']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  protected handleLogout(): void {
    this.sessionStore.clearSession();
    this.router.navigate(['/']);
  }

  protected cardThumbnail(card: ContentCard): string | null {
    if (card.thumbnailUrl) return card.thumbnailUrl;
    if (card.cardType === 'VIDEO' && card.mediaUrl) {
      const match = card.mediaUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    if (card.cardType === 'INFOGRAPHIC' && card.mediaUrl) return card.mediaUrl;
    return null;
  }
}
