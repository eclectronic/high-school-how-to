import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentApiService } from '../../core/services/content-api.service';
import { Tag, CardType, CardStatus, SaveCardRequest } from '../../core/models/content.models';
import { TiptapEditorComponent } from './tiptap-editor.component';

interface CardForm {
  title: string;
  slug: string;
  description: string;
  cardType: CardType;
  status: CardStatus;
  mediaUrl: string;
  printMediaUrl: string;
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
  imports: [FormsModule, RouterLink, TiptapEditorComponent],
  templateUrl: './content-editor.component.html',
  styleUrl: './content-editor.component.scss',
})
export class ContentEditorComponent implements OnInit {
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

  readonly cardTypes: CardType[] = ['VIDEO', 'INFOGRAPHIC', 'ARTICLE'];
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

  ngOnInit() {
    this.api.adminListTags().subscribe({
      next: (tags) => this.allTags.set(tags.sort((a, b) => a.name.localeCompare(b.name))),
    });

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
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load card');
          this.loading.set(false);
        },
      });
    }
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

  protected onEditorChange(event: { json: string; html: string }) {
    this.bodyJson = event.json;
    this.bodyHtml = event.html;
  }

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

  protected save() {
    if (!this.form.tagIds.size) {
      this.error.set('Select at least one tag');
      return;
    }

    const req: SaveCardRequest = {
      title: this.form.title,
      slug: this.form.slug,
      description: this.form.description || null,
      cardType: this.form.cardType,
      mediaUrl: this.form.mediaUrl || null,
      printMediaUrl: this.form.printMediaUrl || null,
      thumbnailUrl: this.form.thumbnailUrl || null,
      coverImageUrl: this.form.coverImageUrl || null,
      bodyJson: this.bodyJson,
      bodyHtml: this.bodyHtml,
      backgroundColor: this.form.backgroundColor || null,
      textColor: this.form.textColor || null,
      simpleLayout: this.form.simpleLayout,
      status: this.form.status,
      tagIds: Array.from(this.form.tagIds),
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
