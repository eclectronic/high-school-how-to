import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCard, Tag } from '../../core/models/content.models';

@Component({
  selector: 'app-topic-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './topic-page.component.html',
  styleUrl: './topic-page.component.scss',
})
export class TopicPageComponent implements OnInit {
  private readonly api = inject(ContentApiService);
  private readonly route = inject(ActivatedRoute);

  protected tag = signal<Tag | null>(null);
  protected cards = signal<ContentCard[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;

    // Load tag metadata from all tags
    this.api.getAllTags().subscribe({
      next: (tags) => {
        const found = tags.find((t) => t.slug === slug);
        if (found) this.tag.set(found);
      },
    });

    this.api.getCardsByTag(slug).subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load topic');
        this.loading.set(false);
      },
    });
  }

  protected cardThumbnail(card: ContentCard): string | null {
    if (card.thumbnailUrl) return card.thumbnailUrl;
    if (card.cardType === 'INFOGRAPHIC' && card.mediaUrl) return card.mediaUrl;
    if (card.cardType === 'VIDEO' && card.mediaUrl) {
      const match = card.mediaUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
  }
}
