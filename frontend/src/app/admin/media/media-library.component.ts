import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaApiService, MediaAsset, MediaUsage } from '../../core/services/media-api.service';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.scss',
})
export class MediaLibraryComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected assets = signal<MediaAsset[]>([]);
  protected loading = signal(false);
  protected uploading = signal(false);
  protected error = signal<string | null>(null);
  protected success = signal<string | null>(null);
  protected search = '';
  protected page = 0;
  protected totalPages = 0;
  protected totalElements = 0;

  protected editingAsset = signal<MediaAsset | null>(null);
  protected editAltText = '';
  protected editFilename = '';

  protected confirmDeleteAsset = signal<MediaAsset | null>(null);
  protected usageForDelete = signal<MediaUsage | null>(null);
  protected loadingUsage = signal(false);

  constructor(private api: MediaApiService) {}

  ngOnInit() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.search, this.page).subscribe({
      next: (p) => {
        this.assets.set(p.content);
        this.totalPages = p.totalPages;
        this.totalElements = p.totalElements;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load media library');
        this.loading.set(false);
      },
    });
  }

  protected onSearchChange() {
    this.page = 0;
    this.load();
  }

  protected prevPage() {
    if (this.page > 0) { this.page--; this.load(); }
  }

  protected nextPage() {
    if (this.page < this.totalPages - 1) { this.page++; this.load(); }
  }

  protected triggerUpload() {
    this.fileInput.nativeElement.click();
  }

  protected onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.api.upload(file).subscribe({
      next: (asset) => {
        this.uploading.set(false);
        this.assets.update((list) => [asset, ...list]);
        this.totalElements++;
        this.success.set('Image uploaded successfully');
        setTimeout(() => this.success.set(null), 3000);
      },
      error: () => {
        this.error.set('Upload failed');
        this.uploading.set(false);
      },
    });
    (event.target as HTMLInputElement).value = '';
  }

  protected openEdit(asset: MediaAsset) {
    this.editingAsset.set(asset);
    this.editAltText = asset.altText ?? '';
    this.editFilename = asset.filename ?? '';
  }

  protected saveEdit() {
    const asset = this.editingAsset();
    if (!asset) return;
    this.api.patch(asset.id, this.editAltText || null, this.editFilename || null).subscribe({
      next: (updated) => {
        this.assets.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        this.editingAsset.set(null);
      },
      error: () => this.error.set('Failed to save changes'),
    });
  }

  protected confirmDelete(asset: MediaAsset) {
    this.confirmDeleteAsset.set(asset);
    this.usageForDelete.set(null);
    this.loadingUsage.set(true);
    this.api.usage(asset.id).subscribe({
      next: (u) => { this.usageForDelete.set(u); this.loadingUsage.set(false); },
      error: () => this.loadingUsage.set(false),
    });
  }

  protected executeDelete() {
    const asset = this.confirmDeleteAsset();
    if (!asset) return;
    this.api.delete(asset.id).subscribe({
      next: () => {
        this.assets.update((list) => list.filter((a) => a.id !== asset.id));
        this.totalElements--;
        this.confirmDeleteAsset.set(null);
      },
      error: (err) => {
        this.error.set(err.error?.detail ?? 'Failed to delete image');
        this.confirmDeleteAsset.set(null);
      },
    });
  }

  protected cancelDelete() {
    this.confirmDeleteAsset.set(null);
    this.usageForDelete.set(null);
  }

  protected formatBytes(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
