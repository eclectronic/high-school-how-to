import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContentApiService } from '../../core/services/content-api.service';
import { CardType, ContentCard, SaveCardRequest, Tag } from '../../core/models/content.models';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

const EXCLUDED_TAG_SLUGS = new Set(['about', 'help']);

@Component({
  selector: 'app-how-to-page',
  standalone: true,
  imports: [RouterLink, SiteNavComponent, FormsModule],
  templateUrl: './how-to-page.component.html',
  styleUrl: './how-to-page.component.scss',
})
export class HowToPageComponent {
  private readonly api = inject(ContentApiService);
  private readonly router = inject(Router);
  protected readonly editModeStore = inject(EditModeStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly loading = signal(true);
  protected readonly allCards = signal<ContentCard[]>([]);
  protected readonly selectedTagSlug = signal<string | null>(null);
  protected readonly newCardMenuOpen = signal(false);

  // Drag-to-topic state
  protected readonly draggingCard = signal<ContentCard | null>(null);
  protected readonly dragOverTagSlug = signal<string | null>(null);
  protected readonly toastMessage = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // New topic popover state
  protected readonly newTopicPopoverOpen = signal(false);
  protected newTopicName = '';
  protected readonly newTopicError = signal<string | null>(null);

  protected readonly showNewTile = computed(
    () => this.sessionStore.isAdmin() && this.editModeStore.enabled(),
  );

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

  constructor() {
    effect(() => {
      const editMode = this.editModeStore.enabled();
      const admin = this.sessionStore.isAdmin();
      this.loadCards(editMode && admin);
    });
  }

  protected loadCards(asAdmin: boolean): void {
    this.loading.set(true);
    const request$ = asAdmin ? this.api.adminListCards() : this.api.getPublishedCards();
    request$.subscribe({
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

  protected navigateToEdit(slug: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/content', slug], { queryParams: { edit: 'focus' } });
  }

  protected openNewCardMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.newCardMenuOpen.set(true);
  }

  protected closeNewCardMenu(): void {
    this.newCardMenuOpen.set(false);
  }

  protected createCard(cardType: CardType): void {
    this.closeNewCardMenu();
    this.api.adminSkeletonCreate(cardType).subscribe({
      next: (card) => {
        this.router.navigate(['/content', card.slug], { queryParams: { edit: 'focus' } });
      },
    });
  }

  protected isAlreadyTagged(tag: Tag): boolean {
    const card = this.draggingCard();
    if (!card || !this.editModeStore.enabled()) return false;
    return card.tags.some((t) => t.slug === tag.slug);
  }

  // ── Drag-to-topic ──────────────────────────────────────────────

  protected onDragStart(event: DragEvent, card: ContentCard): void {
    this.draggingCard.set(card);
    event.dataTransfer?.setData('text/plain', String(card.id));
  }

  protected onDragEnd(): void {
    this.draggingCard.set(null);
    this.dragOverTagSlug.set(null);
  }

  protected onPillDragOver(event: DragEvent, tagSlug: string): void {
    if (!this.draggingCard()) return;
    event.preventDefault();
    this.dragOverTagSlug.set(tagSlug);
  }

  protected onPillDragLeave(): void {
    this.dragOverTagSlug.set(null);
  }

  protected onPillDrop(event: DragEvent, tag: Tag): void {
    event.preventDefault();
    const card = this.draggingCard();
    this.dragOverTagSlug.set(null);
    this.draggingCard.set(null);
    if (!card) return;
    if (card.tags.some((t) => t.slug === tag.slug)) return;

    const newTagIds = [...card.tags.map((t) => t.id), tag.id];
    const req = this.buildSaveRequest(card, newTagIds);

    this.api.adminUpdateCard(card.id, req).subscribe({
      next: (saved) => {
        this.allCards.update((cards) =>
          cards.map((c) => (c.id === saved.id ? { ...c, tags: saved.tags } : c)),
        );
        this.showToast(`Added '${tag.name}' to '${card.title}'`);
      },
      error: () => this.showToast('Failed to update card'),
    });
  }

  private buildSaveRequest(card: ContentCard, tagIds: number[]): SaveCardRequest {
    return {
      title: card.title,
      slug: card.slug,
      description: card.description,
      cardType: card.cardType,
      mediaUrl: card.mediaUrl,
      printMediaUrl: card.printMediaUrl,
      mediaUrls: card.mediaUrls,
      thumbnailUrl: card.thumbnailUrl,
      coverImageUrl: card.coverImageUrl,
      bodyJson: null,
      bodyHtml: card.bodyHtml,
      backgroundColor: card.backgroundColor,
      textColor: card.textColor,
      simpleLayout: card.simpleLayout,
      status: card.status,
      tagIds,
      links: card.links.map((l) => ({
        targetCardId: l.targetCardId,
        linkText: l.linkText,
        sortOrder: l.sortOrder,
      })),
      templateTasks: card.templateTasks.map((t) => ({ description: t.description })),
    };
  }

  private showToast(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage.set(message);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 4000);
  }

  // ── New topic popover ──────────────────────────────────────────

  protected openNewTopicPopover(event: MouseEvent): void {
    event.stopPropagation();
    this.newTopicName = '';
    this.newTopicError.set(null);
    this.newTopicPopoverOpen.set(!this.newTopicPopoverOpen());
  }

  protected closeNewTopicPopover(): void {
    this.newTopicPopoverOpen.set(false);
    this.newTopicError.set(null);
  }

  protected createTopic(): void {
    const name = this.newTopicName.trim();
    if (!name) return;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    this.api.adminCreateTag({ name, slug, description: null, sortOrder: 999 }).subscribe({
      next: () => {
        this.closeNewTopicPopover();
        this.loadCards(this.sessionStore.isAdmin() && this.editModeStore.enabled());
      },
      error: (err) => {
        if (err.status === 409) {
          this.newTopicError.set('A topic with this name already exists.');
        } else {
          this.newTopicError.set('Failed to create topic.');
        }
      },
    });
  }
}
