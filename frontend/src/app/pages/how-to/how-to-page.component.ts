import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard, Tag } from '../../core/models/content.models';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';

const EXCLUDED_TAG_SLUGS = new Set(['about', 'help']);

@Component({
  selector: 'app-how-to-page',
  standalone: true,
  imports: [RouterLink, SiteNavComponent],
  templateUrl: './how-to-page.component.html',
  styleUrl: './how-to-page.component.scss',
})
export class HowToPageComponent implements OnInit {
  private readonly api = inject(ContentApiService);

  protected readonly loading = signal(true);
  protected readonly allCards = signal<ContentCard[]>([]);
  protected readonly selectedTagSlug = signal<string | null>(null);

  protected readonly visibleCards = computed(() =>
    this.allCards().filter(
      (card) => !card.tags.some((t) => EXCLUDED_TAG_SLUGS.has(t.slug)),
    ),
  );

  protected readonly availableTags = computed<Tag[]>(() => {
    const seen = new Set<number>();
    const tags: Tag[] = [];
    for (const card of this.visibleCards()) {
      for (const tag of card.tags) {
        if (!EXCLUDED_TAG_SLUGS.has(tag.slug) && !seen.has(tag.id)) {
          seen.add(tag.id);
          tags.push(tag);
        }
      }
    }
    return tags.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  protected readonly filteredCards = computed<ContentCard[]>(() => {
    const slug = this.selectedTagSlug();
    if (!slug) return this.visibleCards();
    return this.visibleCards().filter((card) => card.tags.some((t) => t.slug === slug));
  });

  ngOnInit(): void {
    this.api.getPublishedCards().subscribe({
      next: (cards) => {
        this.allCards.set(cards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectTag(slug: string | null): void {
    this.selectedTagSlug.set(slug);
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
