import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentApiService } from '../../core/services/content-api.service';

export interface UploadedImageResult {
  url: string;
  thumbnailUrl: string | null;
  assetId?: number;
}

function sanitizeFilename(source: string, ext: string): string {
  // Strip path separators
  const base = source.replace(/.*[/\\]/, '');
  // Drop existing extension portion
  const noExt = base.replace(/\.[^.]*$/, '');
  // Lowercase, replace non-[a-z0-9-] with hyphens, trim leading/trailing hyphens
  let slug = noExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 64);
  if (!slug) slug = 'image';
  return `${slug}.${ext.toLowerCase()}`;
}

@Component({
  selector: 'app-image-upload-popover',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="upload-popover">
      <h3 class="upload-popover__title">Upload image</h3>

      <div class="upload-popover__preview-row">
        @if (previewUrl) {
          <img class="upload-popover__thumb" [src]="previewUrl" alt="Preview" />
        }
        <div class="upload-popover__meta">
          <span class="upload-popover__filename">{{ file.name }}</span>
          @if (fileSizeMb) {
            <span class="upload-popover__size">{{ fileSizeMb }} MB</span>
          }
        </div>
      </div>

      <label class="upload-popover__label">
        Title (optional)
        <input
          class="upload-popover__input"
          type="text"
          [(ngModel)]="title"
          placeholder="e.g. Study Tips Cover"
        />
      </label>

      <p class="upload-popover__preview-label">
        Filename will be: <strong>{{ previewFilename }}</strong>
      </p>

      @if (conflict()) {
        <div class="upload-popover__conflict">
          &#9888; A file named '{{ previewFilename }}' already exists.
          <button type="button" class="upload-popover__use-existing" (click)="useExisting()">
            Use existing
          </button>
        </div>
      }

      <div class="upload-popover__actions">
        <button
          type="button"
          class="upload-popover__btn upload-popover__btn--cancel"
          (click)="cancel()"
          [disabled]="uploading()"
        >
          Cancel
        </button>
        <button
          type="button"
          class="upload-popover__btn upload-popover__btn--upload"
          (click)="doUpload()"
          [disabled]="uploading()"
        >
          {{ uploading() ? 'Uploading…' : 'Upload' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .upload-popover {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1.25rem;
        width: 340px;
        box-sizing: border-box;
      }

      .upload-popover__title {
        font-size: 1rem;
        font-weight: 700;
        margin: 0 0 0.75rem;
      }

      .upload-popover__preview-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        margin-bottom: 0.75rem;
      }

      .upload-popover__thumb {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 0.4rem;
        border: 1px solid #e5e7eb;
        flex-shrink: 0;
      }

      .upload-popover__meta {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
      }

      .upload-popover__filename {
        font-size: 0.8rem;
        font-weight: 600;
        color: #111827;
        word-break: break-all;
      }

      .upload-popover__size {
        font-size: 0.75rem;
        color: #6b7280;
      }

      .upload-popover__label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 0.5rem;
      }

      .upload-popover__input {
        display: block;
        width: 100%;
        padding: 0.35rem 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
        font-size: 0.85rem;
        margin-top: 0.25rem;
        box-sizing: border-box;
      }

      .upload-popover__preview-label {
        font-size: 0.75rem;
        color: #6b7280;
        margin: 0.5rem 0;
      }

      .upload-popover__conflict {
        font-size: 0.8rem;
        color: #d97706;
        margin: 0.5rem 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .upload-popover__use-existing {
        background: none;
        border: 1px solid #d97706;
        color: #d97706;
        border-radius: 0.35rem;
        padding: 0.2rem 0.5rem;
        font-size: 0.8rem;
        cursor: pointer;
        margin-left: 0.25rem;
      }

      .upload-popover__actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 0.75rem;
      }

      .upload-popover__btn {
        padding: 0.35rem 0.9rem;
        border-radius: 0.4rem;
        border: none;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }

      .upload-popover__btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .upload-popover__btn--cancel {
        background: #f3f4f6;
        color: #374151;
      }

      .upload-popover__btn--upload {
        background: #2563eb;
        color: #fff;
      }

      .upload-popover__btn--upload:hover:not(:disabled) {
        background: #1d4ed8;
      }
    `,
  ],
})
export class ImageUploadPopoverComponent implements OnDestroy {
  private readonly contentApi = inject(ContentApiService);

  @Input() set file(value: File) {
    this._file = value;
    // Clean up previous object URL before creating a new one
    if (this._previewUrl) {
      URL.revokeObjectURL(this._previewUrl);
    }
    this._previewUrl = value ? URL.createObjectURL(value) : null;
  }
  get file(): File {
    return this._file;
  }

  @Input() subfolder = 'images';

  @Output() uploaded = new EventEmitter<UploadedImageResult>();
  @Output() cancelled = new EventEmitter<void>();

  protected title = '';
  protected uploading = signal(false);
  protected conflict = signal<{ existingUrl: string; message: string } | null>(null);

  private _file!: File;
  private _previewUrl: string | null = null;

  get previewUrl(): string | null {
    return this._previewUrl;
  }

  get fileSizeMb(): string | null {
    if (!this._file) return null;
    return (this._file.size / 1024 / 1024).toFixed(1);
  }

  protected get previewFilename(): string {
    const source = this.title.trim() || this._file?.name || '';
    const ext = this._file?.name?.split('.').pop() ?? 'jpg';
    return sanitizeFilename(source, ext);
  }

  ngOnDestroy(): void {
    if (this._previewUrl) {
      URL.revokeObjectURL(this._previewUrl);
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected useExisting(): void {
    const c = this.conflict();
    if (!c) return;
    this.uploaded.emit({ url: c.existingUrl, thumbnailUrl: null });
    this.conflict.set(null);
  }

  protected doUpload(): void {
    this.uploading.set(true);
    this.conflict.set(null);
    this.contentApi.adminUploadImage(this._file, this.title.trim() || undefined).subscribe({
      next: (result) => {
        this.uploading.set(false);
        this.uploaded.emit({ url: result.url, thumbnailUrl: result.thumbnailUrl });
      },
      error: (err) => {
        this.uploading.set(false);
        if (err.status === 409 && err.error?.existingUrl) {
          this.conflict.set({
            existingUrl: err.error.existingUrl,
            message: err.error.message ?? 'File already exists.',
          });
        }
      },
    });
  }
}
