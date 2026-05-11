import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaApiService, MediaAsset } from '../../core/services/media-api.service';

@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.scss',
})
export class MediaPickerComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Output() selected = new EventEmitter<MediaAsset>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected assets = signal<MediaAsset[]>([]);
  protected loading = signal(false);
  protected uploading = signal(false);
  protected error = signal<string | null>(null);
  protected search = '';
  protected page = 0;
  protected totalPages = 0;

  constructor(private api: MediaApiService) {}

  ngOnInit() {
    if (this.open) this.load();
  }

  ngOnChanges() {
    if (this.open) {
      this.page = 0;
      this.search = '';
      this.load();
    }
  }

  protected load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.search, this.page).subscribe({
      next: (p) => {
        this.assets.set(p.content);
        this.totalPages = p.totalPages;
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

  protected select(asset: MediaAsset) {
    this.selected.emit(asset);
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
        this.select(asset);
      },
      error: () => {
        this.error.set('Upload failed');
        this.uploading.set(false);
      },
    });
    (event.target as HTMLInputElement).value = '';
  }

  protected close() {
    this.closed.emit();
  }
}
