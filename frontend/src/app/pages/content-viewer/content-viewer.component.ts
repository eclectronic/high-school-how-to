import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  signal,
  computed,
  inject,
  effect,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SiteNavComponent } from '../../shared/site-nav/site-nav.component';
import { DomSanitizer, SafeHtml, SafeResourceUrl, Title } from '@angular/platform-browser';
import { Subscription, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ContentApiService } from '../../core/services/content-api.service';
import {
  CardType,
  ContentCard,
  ContentCardAdmin,
  MediaUrlEntry,
  LockerStatusResponse,
  SaveCardRequest,
  cardTypeIcon,
} from '../../core/models/content.models';
import { SessionStore } from '../../core/session/session.store';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { PropertiesPanelComponent } from '../../shared/inline-edit/properties-panel.component';
import { InlineTitleEditComponent } from '../../shared/inline-title-edit/inline-title-edit.component';
import { TiptapEditorComponent } from '../../admin/content/tiptap-editor.component';
import { ImagePickerComponent } from '../../admin/images/image-picker.component';
import { MediaAsset } from '../../core/services/media-api.service';
import { TodoListEditComponent } from '../../shared/inline-edit/todo-list-edit.component';

interface PickerTarget {
  kind: 'replace' | 'add' | 'print' | 'video-thumbnail';
  index: number;
}

@Component({
  selector: 'app-content-viewer',
  standalone: true,
  imports: [RouterLink, SiteNavComponent, PropertiesPanelComponent, InlineTitleEditComponent, TiptapEditorComponent, ImagePickerComponent, TodoListEditComponent],
  templateUrl: './content-viewer.component.html',
  styleUrl: './content-viewer.component.scss',
})
export class ContentViewerComponent implements OnInit, OnDestroy {
  private readonly api = inject(ContentApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly titleService = inject(Title);
  private readonly sessionStore = inject(SessionStore);
  protected readonly editModeStore = inject(EditModeStore);
  private readonly subs = new Subscription();

  private static readonly APP_TITLE = 'High School How To';

  protected readonly isAuthenticated = this.sessionStore.isAuthenticated;
  protected readonly isAdmin = this.sessionStore.isAdmin;
  protected readonly editMode = this.editModeStore.enabled;

  protected card = signal<ContentCard | null>(null);
  protected adminCard = signal<ContentCardAdmin | null>(null);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected safeHtml = signal<SafeHtml | null>(null);
  protected lockerStatus = signal<LockerStatusResponse | null>(null);
  protected lockerActionPending = signal(false);
  protected lockerAddedToast = signal(false);
  protected isSaving = signal(false);
  protected autoFocusTitle = signal(false);

  protected readonly displayCard = computed(() => {
    const dirty = this.editModeStore.dirtyCard();
    const base = this.adminCard() ?? this.card();
    if (!dirty || !base) return base;
    return { ...base, ...dirty } as ContentCardAdmin;
  });

  protected readonly safeEmbed = computed((): SafeResourceUrl | null => {
    const c = (this.isAdmin() && this.editMode()) ? this.displayCard() : this.card();
    if (!c || c.cardType !== 'VIDEO' || !c.mediaUrl) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.buildEmbedUrl(c.mediaUrl));
  });

  /** Controls the mobile title overlay on infographic cards. Shown on load, fades after 3s. */
  protected overlayVisible = signal(false);
  private overlayFadeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Brief keyboard-hint tooltip shown near the nav arrows on first load. */
  protected navHintVisible = signal(false);
  private navHintTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Infographic carousel ──────────────────────────────────────────────────────
  @ViewChild('carouselTrack') carouselTrackRef?: ElementRef<HTMLDivElement>;

  protected carouselIndex = signal(0);

  // Slide picker state (replace/add/print)
  protected pickerTarget = signal<PickerTarget | null>(null);

  // Slide drag-reorder state
  protected slideDragFromIndex = signal<number | null>(null);
  protected slideDropTargetIndex = signal<number | null>(null);

  /** Resolved mediaUrls list for the current INFOGRAPHIC card.
   *  In edit mode, reflects any dirty changes made since the card loaded.
   *  Falls back to synthesizing from the legacy scalar fields when mediaUrls is absent or empty.
   */
  protected readonly mediaUrls = computed((): MediaUrlEntry[] => {
    const card = (this.isAdmin() && this.editMode()) ? this.displayCard() : this.card();
    if (!card || card.cardType !== 'INFOGRAPHIC') return [];
    if (card.mediaUrls?.length) return card.mediaUrls;
    if (card.mediaUrl) return [{ url: card.mediaUrl, printUrl: card.printMediaUrl ?? null, alt: null }];
    return [];
  });

  protected readonly isMultiImage = computed(() => this.mediaUrls().length > 1);

  /** Print URL for the currently visible inline slide. */
  protected readonly currentPrintUrl = computed(() => {
    const entries = this.mediaUrls();
    return entries[this.carouselIndex()]?.printUrl ?? null;
  });

  // ── Infographic lightbox ─────────────────────────────────────────────────────
  protected lightboxOpen = signal(false);
  protected lightboxIndex = signal(0);
  protected lightboxZoom = signal(1);
  protected lightboxPanX = signal(0);
  protected lightboxPanY = signal(0);
  protected lightboxDragging = signal(false);
  private dragStartX = 0;
  private dragStartY = 0;
  private panAtDragStart = { x: 0, y: 0 };

  protected lightboxTransform = computed(
    () => `translate(${this.lightboxPanX()}px, ${this.lightboxPanY()}px) scale(${this.lightboxZoom()})`,
  );
  protected lightboxZoomPercent = computed(() => Math.round(this.lightboxZoom() * 100));

  protected readonly lightboxCurrentEntry = computed((): MediaUrlEntry | null => {
    const entries = this.mediaUrls();
    if (!entries.length) {
      const card = this.card();
      return card?.mediaUrl ? { url: card.mediaUrl, printUrl: card.printMediaUrl ?? null, alt: null } : null;
    }
    return entries[this.lightboxIndex()] ?? null;
  });

  protected readonly lightboxPrintUrl = computed(() => this.lightboxCurrentEntry()?.printUrl ?? null);

  /** True when the card should render without nav arrows, back link, or tag header. */
  protected simpleLayout = computed(() => {
    const forceSimple = this.route.snapshot.data['forceSimpleLayout'] === true;
    return forceSimple || (this.card()?.simpleLayout ?? false);
  });

  /** Slug of the tag currently used for prev/next navigation, or null for all content. */
  protected tagSlug = signal<string | null>(null);

  /** True when the current card is tagged as a help article. */
  protected isHelpArticle = computed(() => {
    return this.card()?.tags.some((t) => t.slug === 'help') ?? false;
  });

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

  constructor() {
    // Watch for save requests from the global save bar
    effect(() => {
      if (this.editModeStore.pendingSave() > 0) {
        this.saveCard();
      }
    });
  }

  ngOnInit(): void {
    // Re-load the nav list whenever the tag query param changes (supports in-page switching).
    this.subs.add(
      this.route.queryParamMap.subscribe((qp) => {
        const tag = qp.get('tag');
        this.tagSlug.set(tag);
        this.autoFocusTitle.set(qp.get('edit') === 'focus');
        const list$ = tag ? this.api.getCardsByTag(tag) : this.api.getPublishedCards();
        list$.subscribe({
          next: (cards) => {
            const filtered = tag
              ? cards
              : cards.filter(
                  (c) => c.slug !== 'about-mission' && !c.tags.some((t) => t.slug === 'help'),
                );
            this.navCards.set(filtered);
          },
        });
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
            this.safeHtml.set(null);
            this.adminCard.set(null);
            this.editModeStore.discard();
            const slug = fixedSlug ?? params.get('slug')!;
            return this.api.getCardBySlug(slug).pipe(
              catchError((err) => {
                if (err.status === 404 && this.sessionStore.isAdmin() && this.editModeStore.enabled()) {
                  return this.api.adminGetCardBySlug(slug);
                }
                throw err;
              }),
            );
          }),
        )
        .subscribe({
          next: (card) => {
            this.card.set(card);
            if ('bodyJson' in card) {
              this.adminCard.set(card as ContentCardAdmin);
            }
            this.lockerStatus.set(null);
            this.carouselIndex.set(0);
            if (card.cardType === 'ARTICLE' && card.bodyHtml) {
              // bodyHtml is already server-side sanitized by OWASP
              this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(card.bodyHtml));
            }
            if (card.cardType === 'TODO_LIST' && this.isAuthenticated()) {
              this.api.getLockerStatus(card.slug).subscribe({
                next: (status) => this.lockerStatus.set(status),
              });
            }
            if (card.cardType === 'INFOGRAPHIC') {
              this.startOverlayFade();
            }
            this.showNavHint();
            this.titleService.setTitle(`${card.title} | ${ContentViewerComponent.APP_TITLE}`);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Content not found.');
            this.loading.set(false);
          },
        }),
    );
  }

  protected saveCard(): void {
    const dirty = this.editModeStore.dirtyCard();
    const card = this.adminCard() ?? this.card();
    if (!dirty || !card) return;
    const merged = { ...card, ...dirty } as ContentCardAdmin;
    const req = this.buildSaveRequest(merged);
    this.isSaving.set(true);
    this.api.adminUpdateCard(card.id, req).subscribe({
      next: (saved) => {
        this.card.set(saved);
        this.adminCard.set(saved as unknown as ContentCardAdmin);
        this.editModeStore.commit(saved as unknown as Record<string, unknown>);
        this.isSaving.set(false);
      },
      error: () => {
        this.editModeStore.setError('Save failed. Please try again.');
        this.isSaving.set(false);
      },
    });
  }

  private buildSaveRequest(card: ContentCardAdmin): SaveCardRequest {
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
      bodyJson: card.bodyJson ?? null,
      bodyHtml: card.bodyHtml ?? null,
      backgroundColor: card.backgroundColor,
      textColor: card.textColor,
      simpleLayout: card.simpleLayout,
      status: card.status,
      tagIds: card.tags.map(t => t.id),
      links: card.links.map(l => ({ targetCardId: l.targetCardId, linkText: l.linkText, sortOrder: l.sortOrder })),
      templateTasks: card.templateTasks.map(t => ({ description: t.description })),
    };
  }

  protected deleteCard(): void {
    const card = this.adminCard() ?? this.card();
    if (!card) return;
    if (!confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    this.api.adminDeleteCard(card.id).subscribe({
      next: () => this.router.navigate(['/how-to']),
      error: () => this.editModeStore.setError('Delete failed.'),
    });
  }

  protected onBodyChange(e: { json: string; html: string }): void {
    this.editModeStore.markDirty({ bodyJson: e.json, bodyHtml: e.html });
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
        this.lockerAddedToast.set(true);
        setTimeout(() => this.lockerAddedToast.set(false), 4000);
      },
      error: () => {
        this.lockerActionPending.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.overlayFadeTimer) clearTimeout(this.overlayFadeTimer);
    if (this.navHintTimer) clearTimeout(this.navHintTimer);
    this.titleService.setTitle(ContentViewerComponent.APP_TITLE);
    document.body.classList.remove('lightbox-open');
  }

  protected toggleOverlay(): void {
    this.overlayVisible.update((v) => !v);
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) return;

    if (this.lightboxOpen()) {
      if (event.key === 'Escape') { this.closeLightbox(); return; }
      if (event.key === 'ArrowLeft') { this.lightboxPrevSlide(); return; }
      if (event.key === 'ArrowRight') { this.lightboxNextSlide(); return; }
      if (event.key === '+') { this.lightboxZoomIn(); return; }
      if (event.key === '-') { this.lightboxZoomOut(); return; }
      if (event.key === '0') { this.lightboxResetZoom(); return; }
      return;
    }

    if (event.key === 'ArrowLeft' && this.prevCard()) this.navigateTo(this.prevCard()!);
    if (event.key === 'ArrowRight' && this.nextCard()) this.navigateTo(this.nextCard()!);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.editModeStore.isDirty()) {
      event.preventDefault();
    }
  }

  // ── Infographic lightbox ─────────────────────────────────────────────────────

  protected openLightbox(): void {
    this.lightboxIndex.set(this.carouselIndex());
    this.lightboxOpen.set(true);
    this.lightboxZoom.set(1);
    this.lightboxPanX.set(0);
    this.lightboxPanY.set(0);
    document.body.classList.add('lightbox-open');
  }

  protected closeLightbox(): void {
    this.lightboxOpen.set(false);
    this.lightboxDragging.set(false);
    document.body.classList.remove('lightbox-open');
  }

  // ── Carousel ──────────────────────────────────────────────────────────────────

  protected setCarouselIndex(i: number): void {
    const len = this.mediaUrls().length;
    if (i < 0 || i >= len) return;
    this.carouselIndex.set(i);
    this.scrollCarouselTo(i);
  }

  protected carouselPrev(): void {
    this.setCarouselIndex(this.carouselIndex() - 1);
  }

  protected carouselNext(): void {
    this.setCarouselIndex(this.carouselIndex() + 1);
  }

  private scrollCarouselTo(index: number): void {
    const track = this.carouselTrackRef?.nativeElement;
    if (!track) return;
    const slideWidth = track.offsetWidth;
    track.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
  }

  protected onCarouselScroll(event: Event): void {
    const track = event.target as HTMLDivElement;
    const index = Math.round(track.scrollLeft / track.offsetWidth);
    if (index !== this.carouselIndex()) {
      this.carouselIndex.set(index);
    }
  }

  // ── Lightbox slide navigation ────────────────────────────────────────────────

  protected lightboxPrevSlide(): void {
    if (this.lightboxIndex() > 0) {
      this.lightboxIndex.update((i) => i - 1);
      this.lightboxResetZoom();
    }
  }

  protected lightboxNextSlide(): void {
    if (this.lightboxIndex() < this.mediaUrls().length - 1) {
      this.lightboxIndex.update((i) => i + 1);
      this.lightboxResetZoom();
    }
  }

  protected lightboxZoomIn(): void {
    this.lightboxZoom.update((z) => Math.min(z + 0.25, 5));
  }

  protected lightboxZoomOut(): void {
    this.lightboxZoom.update((z) => {
      const next = Math.max(z - 0.25, 0.5);
      if (next <= 1) { this.lightboxPanX.set(0); this.lightboxPanY.set(0); }
      return next;
    });
  }

  protected lightboxResetZoom(): void {
    this.lightboxZoom.set(1);
    this.lightboxPanX.set(0);
    this.lightboxPanY.set(0);
  }

  protected onLightboxWheel(event: WheelEvent): void {
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.03 : -0.03;
    this.lightboxZoom.update((z) => {
      const next = Math.max(0.5, Math.min(5, z + step));
      if (next <= 1) { this.lightboxPanX.set(0); this.lightboxPanY.set(0); }
      return next;
    });
  }

  protected onLightboxDragStart(event: MouseEvent): void {
    if (this.lightboxZoom() <= 1) return;
    this.lightboxDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.panAtDragStart = { x: this.lightboxPanX(), y: this.lightboxPanY() };
    event.preventDefault();
  }

  protected onLightboxDragMove(event: MouseEvent): void {
    if (!this.lightboxDragging()) return;
    this.lightboxPanX.set(this.panAtDragStart.x + (event.clientX - this.dragStartX));
    this.lightboxPanY.set(this.panAtDragStart.y + (event.clientY - this.dragStartY));
  }

  protected onLightboxDragEnd(): void {
    this.lightboxDragging.set(false);
  }

  private showNavHint(): void {
    if (this.navHintTimer) clearTimeout(this.navHintTimer);
    this.navHintVisible.set(true);
    this.navHintTimer = setTimeout(() => this.navHintVisible.set(false), 4000);
  }

  private startOverlayFade(): void {
    if (this.overlayFadeTimer) clearTimeout(this.overlayFadeTimer);
    this.overlayVisible.set(true);
    this.overlayFadeTimer = setTimeout(() => this.overlayVisible.set(false), 3000);
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

  protected readonly cardTypeIcon = cardTypeIcon;

  protected printMedia(url: string): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>Print</title>` +
      `<style>*{margin:0;padding:0}body{display:flex;justify-content:center}` +
      `img{max-width:100%;height:auto;display:block}</style></head>` +
      `<body><img src="${url}"></body></html>`,
    );
    win.document.close();
    win.onload = () => win.print();
  }

  // ── Infographic slide editing ────────────────────────────────────────────────

  protected openSlidePicker(kind: PickerTarget['kind'], index: number): void {
    this.pickerTarget.set({ kind, index });
  }

  protected onSlidePickerSelected(asset: MediaAsset): void {
    const target = this.pickerTarget();
    if (!target) return;
    this.pickerTarget.set(null);
    if (target.kind === 'video-thumbnail') {
      this.editModeStore.markDirty({ thumbnailUrl: asset.url });
      return;
    }
    const entries = [...this.currentMediaUrls()];
    if (target.kind === 'replace') {
      entries[target.index] = { ...entries[target.index], url: asset.url };
    } else if (target.kind === 'add') {
      entries.push({ url: asset.url, printUrl: null, alt: null });
    } else if (target.kind === 'print') {
      entries[target.index] = { ...entries[target.index], printUrl: asset.url };
    }
    this.editModeStore.markDirty({ mediaUrls: entries });
  }

  protected onVideoUrlChange(url: string): void {
    this.editModeStore.markDirty({ mediaUrl: url });
  }

  protected removeSlide(index: number): void {
    const entries = this.currentMediaUrls().filter((_, i) => i !== index);
    this.editModeStore.markDirty({ mediaUrls: entries });
    if (this.carouselIndex() >= entries.length) {
      this.carouselIndex.set(Math.max(0, entries.length - 1));
    }
  }

  protected updateSlideAlt(index: number, alt: string): void {
    const entries = [...this.currentMediaUrls()];
    entries[index] = { ...entries[index], alt: alt || null };
    this.editModeStore.markDirty({ mediaUrls: entries });
  }

  protected filenameFromUrl(url: string): string {
    return url.split('/').pop() ?? url;
  }

  private currentMediaUrls(): MediaUrlEntry[] {
    const entries = this.mediaUrls();
    return entries.length ? entries : [];
  }

  // Slide drag-to-reorder
  protected onSlideDragStart(event: DragEvent, fromIndex: number): void {
    this.slideDragFromIndex.set(fromIndex);
    event.dataTransfer?.setData('text/plain', String(fromIndex));
  }

  protected onSlideDragOver(event: DragEvent, toIndex: number): void {
    if (this.slideDragFromIndex() === null) return;
    event.preventDefault();
    this.slideDropTargetIndex.set(toIndex);
  }

  protected onSlideDragLeave(): void {
    this.slideDropTargetIndex.set(null);
  }

  protected onSlideDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    const fromIndex = this.slideDragFromIndex();
    this.slideDragFromIndex.set(null);
    this.slideDropTargetIndex.set(null);
    if (fromIndex === null || fromIndex === toIndex) return;
    const entries = [...this.currentMediaUrls()];
    const [moved] = entries.splice(fromIndex, 1);
    entries.splice(toIndex, 0, moved);
    this.editModeStore.markDirty({ mediaUrls: entries });
  }

  protected onSlideDragEnd(): void {
    this.slideDragFromIndex.set(null);
    this.slideDropTargetIndex.set(null);
  }

  private buildEmbedUrl(url: string): string {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  }
}
