import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, switchMap } from 'rxjs';
import { ContentApiService } from '../../core/services/content-api.service';
import { SessionStore } from '../../core/session/session.store';
import { ContentCard, LockerStatusResponse } from '../../core/models/content.models';

@Component({
  selector: 'app-content-viewer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './content-viewer.component.html',
  styleUrl: './content-viewer.component.scss',
})
export class ContentViewerComponent implements OnInit, OnDestroy {
  private readonly api = inject(ContentApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly sessionStore = inject(SessionStore);
  private readonly subs = new Subscription();

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;

  protected card = signal<ContentCard | null>(null);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected safeEmbed = signal<SafeResourceUrl | null>(null);
  protected safeHtml = signal<SafeHtml | null>(null);
  protected lockerStatus = signal<LockerStatusResponse | null>(null);
  protected lockerActionPending = signal(false);

  /** True when the card should render without nav arrows, back link, or tag header. */
  protected simpleLayout = computed(() => {
    const forceSimple = this.route.snapshot.data['forceSimpleLayout'] === true;
    return forceSimple || (this.card()?.simpleLayout ?? false);
  });

  /** Slug of the tag currently used for prev/next navigation, or null for all content. */
  protected tagSlug = signal<string | null>(null);

  /** Name of the active tag, resolved from the card's tag list. */
  protected tagName = computed(() => {
    const slug = this.tagSlug();
    if (!slug) return null;
    return this.card()?.tags.find((t) => t.slug === slug)?.name ?? null;
  });

  /** Ordered list of cards used for prev/next navigation. */
  private navCards = signal<ContentCard[]>([]);

  protected prevCard = computed(() => {
    const cards = this.navCards();
    const current = this.card();
    if (!current || cards.length < 2) return null;
    const idx = cards.findIndex((c) => c.id === current.id);
    return idx > 0 ? cards[idx - 1] : null;
  });

  protected nextCard = computed(() => {
    const cards = this.navCards();
    const current = this.card();
    if (!current || cards.length < 2) return null;
    const idx = cards.findIndex((c) => c.id === current.id);
    return idx < cards.length - 1 ? cards[idx + 1] : null;
  });

  ngOnInit(): void {
    // Re-load the nav list whenever the tag query param changes (supports in-page switching).
    this.subs.add(
      this.route.queryParamMap.subscribe((qp) => {
        const tag = qp.get('tag');
        this.tagSlug.set(tag);
        const list$ = tag ? this.api.getCardsByTag(tag) : this.api.getPublishedCards();
        list$.subscribe({ next: (cards) => this.navCards.set(cards) });
      }),
    );

    // React to slug changes so prev/next navigation updates the view in place.
    // When route data provides a fixed slug (e.g. /about), use that instead of the param.
    const fixedSlug: string | null = this.route.snapshot.data['slug'] ?? null;
    this.subs.add(
      this.route.paramMap
        .pipe(
          switchMap((params) => {
            this.loading.set(true);
            this.error.set(null);
            this.safeEmbed.set(null);
            this.safeHtml.set(null);
            return this.api.getCardBySlug(fixedSlug ?? params.get('slug')!);
          }),
        )
        .subscribe({
          next: (card) => {
            this.card.set(card);
            this.lockerStatus.set(null);
            if (card.cardType === 'VIDEO' && card.mediaUrl) {
              this.safeEmbed.set(
                this.sanitizer.bypassSecurityTrustResourceUrl(this.buildEmbedUrl(card.mediaUrl)),
              );
            }
            if (card.cardType === 'ARTICLE' && card.bodyHtml) {
              // bodyHtml is already server-side sanitized by OWASP
              this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(card.bodyHtml));
            }
            if (card.cardType === 'TODO_LIST' && this.isAuthenticated()) {
              this.api.getLockerStatus(card.slug).subscribe({
                next: (status) => this.lockerStatus.set(status),
              });
            }
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Content not found.');
            this.loading.set(false);
          },
        }),
    );
  }

  protected handleAddToLocker(): void {
    const card = this.card();
    if (!card) return;
    if (!this.isAuthenticated()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/content/${card.slug}` },
      });
      return;
    }
    this.lockerActionPending.set(true);
    this.api.addToLocker(card.slug).subscribe({
      next: (list) => {
        this.lockerStatus.set({ added: true, taskListId: list.id });
        this.lockerActionPending.set(false);
      },
      error: () => {
        this.lockerActionPending.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  protected switchTag(tag: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: tag ?? null },
    });
  }

  protected navigateTo(card: ContentCard): void {
    this.router.navigate(['/content', card.slug], {
      queryParams: { tag: this.tagSlug() ?? null },
    });
  }

  private buildEmbedUrl(url: string): string {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  }
}
