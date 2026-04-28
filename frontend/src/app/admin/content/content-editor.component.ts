import { Component, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ContentApiService } from '../../core/services/content-api.service';
import {
  Tag,
  CardType,
  CardStatus,
  MediaUrlEntry,
  SaveCardRequest,
  ContentCardLinkRequest,
  ContentCardSummary,
  cardTypeIcon,
} from '../../core/models/content.models';
import { TiptapEditorComponent } from './tiptap-editor.component';
import { InlineTitleEditComponent } from '../../shared/inline-title-edit/inline-title-edit.component';
import { SwatchPickerComponent } from '../../shared/swatch-picker/swatch-picker.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

interface LinkDraft {
  targetCardId: number;
  targetTitle: string;
  targetCardType: CardType;
  linkText: string;
}

interface TemplateTaskForm {
  description: string;
}

interface CardForm {
  title: string;
  slug: string;
  description: string;
  cardType: CardType;
  status: CardStatus;
  mediaUrl: string;        // VIDEO only
  printMediaUrl: string;   // VIDEO only (legacy; INFOGRAPHIC uses mediaUrls signal)
  thumbnailUrl: string;
  coverImageUrl: string;
  backgroundColor: string;
  textColor: string;
  simpleLayout: boolean;
  tagIds: Set<number>;
}

@Component({
  selector: 'app-content-editor',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DragDropModule,
    TiptapEditorComponent,
    InlineTitleEditComponent,
    SwatchPickerComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './content-editor.component.html',
  styleUrl: './content-editor.component.scss',
})
export class ContentEditorComponent implements OnInit, OnDestroy {
  @ViewChild(TiptapEditorComponent) tiptapEditor?: TiptapEditorComponent;

  protected editId = signal<number | null>(null);
  protected loading = signal(false);
  protected saving = signal(false);
  protected error = signal<string | null>(null);
  protected allTags = signal<Tag[]>([]);

  protected form: CardForm = {
    title: '',
    slug: '',
    description: '',
    cardType: 'VIDEO',
    status: 'DRAFT',
    mediaUrl: '',
    printMediaUrl: '',
    thumbnailUrl: '',
    coverImageUrl: '',
    backgroundColor: '',
    textColor: '',
    simpleLayout: false,
    tagIds: new Set(),
  };

  protected bodyJson: string | null = null;
  protected bodyHtml: string | null = null;
  protected previewMode = signal(false);
  protected uploadingImage = signal(false);
  protected templateTasks = signal<TemplateTaskForm[]>([]);
  protected newTaskDescription = '';

  // Multi-image infographic entries
  protected mediaUrls = signal<MediaUrlEntry[]>([]);
  protected deleteMediaIndex = signal<number | null>(null);

  // TODO_LIST locker-style editor state
  protected showBgSwatchPicker = signal(false);
  protected showTextSwatchPicker = signal(false);
  protected deleteTaskIndex = signal<number | null>(null);

  // Related content links
  protected links: LinkDraft[] = [];
  protected linkSearchQuery = '';
  protected linkSearchResults = signal<ContentCardSummary[]>([]);
  protected showLinkDropdown = signal(false);
  private readonly linkSearch$ = new Subject<string>();
  private readonly subs = new Subscription();

  readonly cardTypes: CardType[] = ['VIDEO', 'INFOGRAPHIC', 'ARTICLE', 'TODO_LIST'];
  readonly statuses: CardStatus[] = ['DRAFT', 'PUBLISHED'];

  constructor(
    private api: ContentApiService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {}

  protected get safePreviewHtml(): SafeHtml | null {
    return this.bodyHtml ? this.sanitizer.bypassSecurityTrustHtml(this.bodyHtml) : null;
  }

  protected toolbarBg(color: string | null | undefined): string {
    if (!color) return 'rgba(255, 255, 255, 0.35)';
    return `color-mix(in srgb, ${color} 88%, #000)`;
  }

  protected toggleBgSwatchPicker(event: Event): void {
    event.stopPropagation();
    this.showBgSwatchPicker.update((v) => !v);
  }

  protected toggleTextSwatchPicker(event: Event): void {
    event.stopPropagation();
    this.showTextSwatchPicker.update((v) => !v);
  }

  ngOnInit() {
    this.api.adminListTags().subscribe({
      next: (tags) => this.allTags.set(tags.sort((a, b) => a.name.localeCompare(b.name))),
    });

    this.subs.add(
      this.linkSearch$
        .pipe(
          debounceTime(250),
          distinctUntilChanged(),
          switchMap((q) => {
            if (!q.trim()) {
              this.linkSearchResults.set([]);
              this.showLinkDropdown.set(false);
              return [];
            }
            return this.api.searchCards(q, this.editId() ?? undefined);
          }),
        )
        .subscribe({
          next: (results) => {
            const linkedIds = new Set(this.links.map((l) => l.targetCardId));
            this.linkSearchResults.set(results.filter((r) => !linkedIds.has(r.id)));
            this.showLinkDropdown.set(true);
          },
        }),
    );

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = Number(id);
      this.editId.set(numId);
      this.loading.set(true);
      this.api.adminGetCard(numId).subscribe({
        next: (card) => {
          this.form = {
            title: card.title,
            slug: card.slug,
            description: card.description ?? '',
            cardType: card.cardType,
            status: card.status,
            mediaUrl: card.mediaUrl ?? '',
            printMediaUrl: card.printMediaUrl ?? '',
            thumbnailUrl: card.thumbnailUrl ?? '',
            coverImageUrl: card.coverImageUrl ?? '',
            backgroundColor: card.backgroundColor ?? '',
            textColor: card.textColor ?? '',
            simpleLayout: card.simpleLayout,
            tagIds: new Set(card.tags.map((t) => t.id)),
          };
          this.bodyJson = card.bodyJson;
          this.bodyHtml = card.bodyHtml;
          this.links = (card.links ?? []).map((l) => ({
            targetCardId: l.targetCardId,
            targetTitle: l.targetTitle,
            targetCardType: l.targetCardType,
            linkText: l.linkText === l.targetTitle ? '' : l.linkText,
          }));
          this.templateTasks.set((card.templateTasks ?? []).map((t) => ({ description: t.description })));
          // Load mediaUrls with defensive fallback for INFOGRAPHIC
          if (card.cardType === 'INFOGRAPHIC') {
            const entries = card.mediaUrls?.length
              ? card.mediaUrls
              : card.mediaUrl
                ? [{ url: card.mediaUrl, printUrl: card.printMediaUrl ?? null, alt: null }]
                : [];
            this.mediaUrls.set(entries);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load card');
          this.loading.set(false);
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  protected onLinkSearchInput() {
    this.linkSearch$.next(this.linkSearchQuery);
  }

  protected addLink(card: ContentCardSummary) {
    this.links.push({
      targetCardId: card.id,
      targetTitle: card.title,
      targetCardType: card.cardType,
      linkText: '',
    });
    this.linkSearchQuery = '';
    this.linkSearchResults.set([]);
    this.showLinkDropdown.set(false);
  }

  protected removeLink(index: number) {
    this.links.splice(index, 1);
  }

  protected moveLinkUp(index: number) {
    if (index > 0) {
      [this.links[index - 1], this.links[index]] = [this.links[index], this.links[index - 1]];
    }
  }

  protected moveLinkDown(index: number) {
    if (index < this.links.length - 1) {
      [this.links[index], this.links[index + 1]] = [this.links[index + 1], this.links[index]];
    }
  }

  protected readonly cardTypeIcon = cardTypeIcon;

  protected hideLinkDropdown() {
    setTimeout(() => this.showLinkDropdown.set(false), 150);
  }

  protected onTitleInput() {
    if (!this.editId()) {
      this.form.slug = this.form.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  protected onTodoTitleChange(title: string): void {
    this.form.title = title;
    this.onTitleInput();
  }

  protected onEditorChange(event: { json: string; html: string }) {
    this.bodyJson = event.json;
    this.bodyHtml = event.html;
  }

  // ── Template tasks ────────────────────────────────────────────────────────

  protected addTemplateTask() {
    const desc = this.newTaskDescription.trim();
    if (!desc || this.templateTasks().length >= 50) return;
    this.templateTasks.update((tasks) => [...tasks, { description: desc }]);
    this.newTaskDescription = '';
  }

  protected confirmDeleteTask(index: number): void {
    this.deleteTaskIndex.set(index);
  }

  protected onDeleteTaskConfirmed(): void {
    const i = this.deleteTaskIndex();
    if (i !== null) {
      this.templateTasks.update((tasks) => tasks.filter((_, idx) => idx !== i));
      this.deleteTaskIndex.set(null);
    }
  }

  protected onDeleteTaskCancelled(): void {
    this.deleteTaskIndex.set(null);
  }

  protected updateTemplateTask(index: number, description: string) {
    this.templateTasks.update((tasks) =>
      tasks.map((t, i) => (i === index ? { description } : t)),
    );
  }

  protected onTaskDrop(event: CdkDragDrop<TemplateTaskForm[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.templateTasks.update((tasks) => {
      const updated = [...tasks];
      moveItemInArray(updated, event.previousIndex, event.currentIndex);
      return updated;
    });
  }

  // ── Multi-image infographic entries ──────────────────────────────────────

  protected addMediaUrl(): void {
    this.mediaUrls.update((entries) => [...entries, { url: '', printUrl: null, alt: null }]);
  }

  protected updateMediaEntryAlt(index: number, alt: string): void {
    this.mediaUrls.update((entries) => entries.map((e, i) => (i === index ? { ...e, alt: alt || null } : e)));
  }

  protected confirmDeleteMedia(index: number): void {
    this.deleteMediaIndex.set(index);
  }

  protected onDeleteMediaConfirmed(): void {
    const i = this.deleteMediaIndex();
    if (i !== null) {
      this.mediaUrls.update((entries) => entries.filter((_, idx) => idx !== i));
      this.deleteMediaIndex.set(null);
    }
  }

  protected onDeleteMediaCancelled(): void {
    this.deleteMediaIndex.set(null);
  }

  protected onMediaDrop(event: CdkDragDrop<MediaUrlEntry[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.mediaUrls.update((entries) => {
      const updated = [...entries];
      moveItemInArray(updated, event.previousIndex, event.currentIndex);
      return updated;
    });
  }

  protected uploadMediaFile(event: Event, entryIndex: number, field: 'url' | 'printUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingImage.set(true);
    this.api.adminUploadImage(file).subscribe({
      next: (res) => {
        this.mediaUrls.update((entries) =>
          entries.map((e, i) =>
            i === entryIndex
              ? { ...e, [field]: field === 'url' ? (res.thumbnailUrl ?? res.url) : res.url }
              : e,
          ),
        );
        // Mirror first entry back into the legacy form field for display
        const first = this.mediaUrls()[0];
        if (entryIndex === 0 && first) {
          this.form.mediaUrl = first.url;
          this.form.printMediaUrl = first.printUrl ?? '';
        }
        this.uploadingImage.set(false);
        input.value = '';
      },
      error: () => {
        this.error.set('Image upload failed');
        this.uploadingImage.set(false);
      },
    });
  }

  // ── Thumbnail / cover image upload ────────────────────────────────────────

  protected toggleTag(tagId: number) {
    if (this.form.tagIds.has(tagId)) {
      this.form.tagIds.delete(tagId);
    } else {
      this.form.tagIds.add(tagId);
    }
  }

  protected uploadFile(event: Event, field: 'thumbnailUrl' | 'coverImageUrl') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingImage.set(true);
    this.api.adminUploadImage(file).subscribe({
      next: (res) => {
        if (field === 'thumbnailUrl') {
          this.form.thumbnailUrl = res.thumbnailUrl ?? res.url;
        } else {
          this.form.coverImageUrl = res.url;
        }
        this.uploadingImage.set(false);
      },
      error: () => {
        this.error.set('Image upload failed');
        this.uploadingImage.set(false);
      },
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  protected save() {
    if (!this.form.tagIds.size) {
      this.error.set('Select at least one tag');
      return;
    }

    if (this.form.cardType === 'TODO_LIST' && this.templateTasks().length === 0) {
      this.error.set('TODO_LIST cards require at least one template task');
      return;
    }

    const linkRequests: ContentCardLinkRequest[] = this.links.map((l, i) => ({
      targetCardId: l.targetCardId,
      linkText: l.linkText.trim() || null,
      sortOrder: i,
    }));

    let mediaUrl: string | null = null;
    let printMediaUrl: string | null = null;
    let mediaUrlsList: MediaUrlEntry[] | null = null;

    if (this.form.cardType === 'INFOGRAPHIC') {
      mediaUrlsList = this.mediaUrls();
      mediaUrl = mediaUrlsList[0]?.url || null;
      printMediaUrl = mediaUrlsList[0]?.printUrl ?? null;
    } else if (this.form.cardType !== 'TODO_LIST') {
      mediaUrl = this.form.mediaUrl || null;
    }

    const req: SaveCardRequest = {
      title: this.form.title,
      slug: this.form.slug,
      description: this.form.description || null,
      cardType: this.form.cardType,
      mediaUrl,
      printMediaUrl,
      mediaUrls: mediaUrlsList,
      thumbnailUrl: this.form.thumbnailUrl || null,
      coverImageUrl: this.form.coverImageUrl || null,
      bodyJson: this.form.cardType === 'ARTICLE' ? this.bodyJson : null,
      bodyHtml: this.form.cardType === 'ARTICLE' ? this.bodyHtml : null,
      backgroundColor: this.form.backgroundColor || null,
      textColor: this.form.textColor || null,
      simpleLayout: this.form.simpleLayout,
      status: this.form.status,
      tagIds: Array.from(this.form.tagIds),
      links: linkRequests,
      templateTasks: this.form.cardType === 'TODO_LIST' ? this.templateTasks() : null,
    };

    this.saving.set(true);
    const id = this.editId();
    const obs = id ? this.api.adminUpdateCard(id, req) : this.api.adminCreateCard(req);

    obs.subscribe({
      next: () => this.router.navigate(['/admin/content']),
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Save failed');
        this.saving.set(false);
      },
    });
  }
}
