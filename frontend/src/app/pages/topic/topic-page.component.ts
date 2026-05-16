import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentApiService } from '../../core/services/content-api.service';
import { CardType, ContentCard, Tag } from '../../core/models/content.models';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

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
  private readonly router = inject(Router);
  protected readonly editModeStore = inject(EditModeStore);
  protected readonly sessionStore = inject(SessionStore);

  protected tag = signal<Tag | null>(null);
  protected cards = signal<ContentCard[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected newCardMenuOpen = signal(false);
  protected toastMessage = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private tagSlug = '';

  protected readonly showNewTile = computed(
    () => this.sessionStore.isAdmin() && this.editModeStore.enabled(),
  );

  constructor() {
    effect(() => {
      const editMode = this.editModeStore.enabled();
      const admin = this.sessionStore.isAdmin();
      if (this.tagSlug) this.loadCards(editMode && admin);
    });
  }

  ngOnInit(): void {
    this.tagSlug = this.route.snapshot.paramMap.get('slug')!;

    this.api.getAllTags().subscribe({
      next: (tags) => {
        const found = tags.find((t) => t.slug === this.tagSlug);
        if (found) this.tag.set(found);
      },
    });

    this.loadCards(this.sessionStore.isAdmin() && this.editModeStore.enabled());
  }

  private loadCards(asAdmin: boolean): void {
    this.loading.set(true);
    this.error.set(null);
    if (asAdmin) {
      this.api.adminListCards().subscribe({
        next: (all) => {
          const filtered = all.filter((c) => c.tags.some((t) => t.slug === this.tagSlug));
          this.cards.set(filtered);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load topic');
          this.loading.set(false);
        },
      });
    } else {
      this.api.getCardsByTag(this.tagSlug).subscribe({
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
  }

  protected navigateToEdit(slug: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/content', slug], { queryParams: { edit: 'focus' } });
  }

  protected openNewCardMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.newCardMenuOpen.update((v) => !v);
  }

  protected closeNewCardMenu(): void {
    this.newCardMenuOpen.set(false);
  }

  protected createCard(cardType: CardType): void {
    const tag = this.tag();
    const tagIds = tag ? [tag.id] : [];
    this.api.adminSkeletonCreate(cardType, tagIds).subscribe({
      next: (card) => {
        this.newCardMenuOpen.set(false);
        this.router.navigate(['/content', card.slug], { queryParams: { edit: 'focus' } });
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
