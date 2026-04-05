import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentCardAdmin, Tag } from '../../core/models/content.models';

@Component({
  selector: 'app-content-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './content-list.component.html',
  styleUrl: './content-list.component.scss',
})
export class ContentListComponent implements OnInit {
  protected cards = signal<ContentCardAdmin[]>([]);
  protected tags = signal<Tag[]>([]);
  protected selectedTagSlug = signal<string | null>(null);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  protected filteredCards = computed(() => {
    const slug = this.selectedTagSlug();
    const sorted = [...this.cards()].sort((a, b) => a.title.localeCompare(b.title));
    if (!slug) return sorted;
    return sorted.filter((c) => c.tags.some((t) => t.slug === slug));
  });

  constructor(private api: ContentApiService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.adminListTags().subscribe({
      next: (tags) => this.tags.set(tags.sort((a, b) => a.name.localeCompare(b.name))),
    });
    this.api.adminListCards().subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load content');
        this.loading.set(false);
      },
    });
  }

  protected selectTag(slug: string | null) {
    this.selectedTagSlug.set(slug);
  }

  protected textPreview(card: ContentCardAdmin): string {
    if (!card.bodyHtml) return '';
    const div = document.createElement('div');
    div.innerHTML = card.bodyHtml;
    return (div.textContent ?? '').trim().slice(0, 300);
  }

  protected delete(card: ContentCardAdmin) {
    if (!confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    this.api.adminDeleteCard(card.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.detail ?? 'Delete failed'),
    });
  }
}
