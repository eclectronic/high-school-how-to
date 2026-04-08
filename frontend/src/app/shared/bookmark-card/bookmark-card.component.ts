import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Bookmark, BookmarkList } from '../../core/models/task.models';
import { BookmarkApiService } from '../../core/services/bookmark-api.service';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { WidgetTitleBarComponent } from '../widget-title-bar/widget-title-bar.component';
import { autoContrastColor, isGradient, firstHexFromGradient } from '../color-picker/color-utils';

@Component({
  selector: 'app-bookmark-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ColorPickerComponent, ConfirmDialogComponent, WidgetTitleBarComponent],
  host: { '[class.bookmark-card--elevated]': 'colorPickerOpen || confirmingDelete || !!confirmDeleteBookmark' },
  template: `
    <article class="bookmark-card" [style.background]="list.color"
             [style.color]="textColor()" (click)="$event.stopPropagation()">

      <!-- Title bar -->
      <app-widget-title-bar
        [title]="list.title"
        [minimized]="minimized"
        (titleChanged)="onTitleChanged($event)"
        (closeClicked)="requestDeleteList()"
        (minimizeToggled)="minimized = !minimized"
      ></app-widget-title-bar>

      <!-- Body (hidden when minimized) -->
      <ng-container *ngIf="!minimized">

      <!-- Body actions -->
      <div class="bookmark-card__body-actions">
        <button type="button" class="icon-btn" (click)="toggleColorPicker()" title="Card color" aria-label="Change card color">
          <span aria-hidden="true">🎨</span>
        </button>
      </div>

      <!-- Color picker -->
      <div class="color-picker-panel" *ngIf="colorPickerOpen" (click)="$event.stopPropagation()">
        <app-color-picker
          [selectedColor]="list.color"
          [selectedTextColor]="list.textColor ?? null"
          (colorChange)="onColorChange($event)"
          (textColorChange)="onTextColorChange($event)"
        ></app-color-picker>
        <button type="button" class="done-btn" (click)="saveColor()">Done</button>
      </div>

      <!-- Bookmark list -->
      <ul class="bookmark-list" cdkDropList (cdkDropListDropped)="reorderBookmarks($event)">
        <li *ngFor="let bm of list.bookmarks" cdkDrag cdkDragLockAxis="y" class="bookmark-item">
          <span class="bookmark-drag" cdkDragHandle aria-label="Drag">☰</span>
          <img *ngIf="bm.faviconUrl" class="bookmark-favicon" [src]="bm.faviconUrl"
               [attr.data-url]="bm.url"
               (error)="onFaviconError($event)" alt="" aria-hidden="true" />
          <span *ngIf="!bm.faviconUrl" class="bookmark-favicon-placeholder">🌐</span>

          <div class="bookmark-info" *ngIf="editingBookmarkId !== bm.id; else editBookmark">
            <a [href]="bm.url" target="_blank" rel="noopener noreferrer" class="bookmark-title"
               [style.color]="textColor()">{{ bm.title || bm.url }}</a>
            <span class="bookmark-host">{{ hostname(bm.url) }}</span>
          </div>
          <ng-template #editBookmark>
            <div class="bookmark-edit-form">
              <input class="bookmark-edit-input" [(ngModel)]="editTitleDraft"
                     placeholder="Title" (keydown.enter)="saveBookmarkEdit(bm)"
                     (keydown.escape)="cancelBookmarkEdit()" autofocus />
              <input class="bookmark-edit-input" [(ngModel)]="editUrlDraft"
                     placeholder="URL" (keydown.enter)="saveBookmarkEdit(bm)"
                     (keydown.escape)="cancelBookmarkEdit()" />
            </div>
          </ng-template>

          <div class="bookmark-item-actions">
            <button type="button" class="icon-btn-sm" (click)="startBookmarkEdit(bm)" title="Edit">✏️</button>
            <button type="button" class="icon-btn-sm danger" (click)="confirmDeleteBookmark = bm" title="Delete">🗑</button>
          </div>
        </li>
      </ul>

      <!-- Add bookmark input -->
      <div class="bookmark-add" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
        <input class="bookmark-url-input"
               [(ngModel)]="newUrlDraft"
               placeholder="Paste or drop a URL…"
               (paste)="onPaste($event)"
               (keydown.enter)="addFromInput()" />
        <button type="button" class="add-btn"
                [disabled]="!newUrlDraft.trim() || adding"
                (click)="addFromInput()">
          {{ adding ? '…' : 'Add' }}
        </button>
      </div>

      <!-- Delete bookmark confirmation -->
      <app-confirm-dialog
        *ngIf="confirmDeleteBookmark"
        [itemName]="confirmDeleteBookmark.title || confirmDeleteBookmark.url"
        (confirmed)="onConfirmDeleteBookmark()"
        (cancelled)="confirmDeleteBookmark = null"
      ></app-confirm-dialog>

      </ng-container><!-- end !minimized -->

      <!-- Delete list confirmation -->
      <app-confirm-dialog
        *ngIf="confirmingDelete"
        [itemName]="list.title"
        (confirmed)="onConfirmDeleteList()"
        (cancelled)="confirmingDelete = false"
      ></app-confirm-dialog>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 1;
    }
    :host.bookmark-card--elevated { z-index: 20; }

    .bookmark-card {
      border-radius: 12px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
      box-shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12);
      border: 1px solid rgba(255,255,255,0.5);
      position: relative;
      overflow: hidden;
    }

    .bookmark-card__body-actions {
      display: flex;
      gap: 0.3rem;
      align-items: center;
      padding: 0.4rem 0.75rem 0;
    }

    .icon-btn {
      width: 1.8rem;
      height: 1.8rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.95rem;
      line-height: 1;
      padding: 0;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(45,26,16,0.2);
      cursor: pointer;
      color: inherit;
      transition: opacity 0.12s;
    }
    .icon-btn:hover { opacity: 0.75; }
    .icon-btn.danger { color: #b00020; border-color: rgba(176,0,32,0.25); }

    .icon-btn-sm {
      width: 1.5rem;
      height: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.8rem;
      line-height: 1;
      padding: 0;
      background: rgba(255,255,255,0.6);
      border: 1px solid rgba(45,26,16,0.15);
      cursor: pointer;
      color: inherit;
      transition: opacity 0.12s;
    }
    .icon-btn-sm:hover { opacity: 0.7; }
    .icon-btn-sm.danger { color: #b00020; }

    .color-picker-panel {
      background: #fffef8;
      border-radius: 10px;
      border: 1px solid rgba(45,26,16,0.12);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      padding: 0.5rem;
      margin: 0 0.75rem;
    }
    .done-btn {
      margin-top: 0.5rem;
      border: 1px dashed rgba(45,26,16,0.2);
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      background: rgba(255,255,255,0.5);
      color: inherit;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }

    .bookmark-list {
      list-style: none;
      padding: 0.4rem 0.75rem 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .bookmark-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(255,255,255,0.55);
      border-radius: 6px;
      padding: 0.3rem 0.5rem;
      min-height: 2rem;
    }
    .bookmark-item.cdk-drag-preview { box-shadow: 0 6px 18px rgba(0,0,0,0.2); border-radius: 6px; }
    .bookmark-item.cdk-drag-placeholder { opacity: 0.2; }

    .bookmark-drag {
      cursor: grab;
      color: rgba(45,26,16,0.35);
      font-size: 0.85rem;
      flex-shrink: 0;
      user-select: none;
    }
    .bookmark-drag:active { cursor: grabbing; }

    .bookmark-favicon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .bookmark-favicon-placeholder { font-size: 0.9rem; flex-shrink: 0; }

    .bookmark-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
    }

    .bookmark-title {
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bookmark-title:hover { text-decoration: underline; }

    .bookmark-host {
      font-size: 0.72rem;
      opacity: 0.55;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bookmark-edit-form {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .bookmark-edit-input {
      border: 1px solid rgba(45,26,16,0.2);
      border-radius: 4px;
      padding: 0.2rem 0.4rem;
      background: rgba(255,255,255,0.8);
      font: inherit;
      font-size: 0.8rem;
      color: #2d1a10;
      width: 100%;
    }

    .bookmark-item-actions {
      display: flex;
      gap: 0.2rem;
      flex-shrink: 0;
    }

    .bookmark-add {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      border: 2px dashed rgba(45,26,16,0.2);
      transition: border-color 0.12s, background 0.12s;
      margin: 0.4rem 0.75rem 0.75rem;
    }
    .bookmark-add.drag-over {
      border-color: rgba(45,26,16,0.5);
      background: rgba(255,255,255,0.5);
    }

    .bookmark-url-input {
      flex: 1;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.85rem;
      color: inherit;
      outline: none;
      min-width: 0;
    }
    .bookmark-url-input::placeholder { color: rgba(45,26,16,0.4); }

    .add-btn {
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(45,26,16,0.2);
      border-radius: 6px;
      padding: 0.25rem 0.6rem;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      color: inherit;
      white-space: nowrap;
      transition: opacity 0.12s;
      flex-shrink: 0;
    }
    .add-btn:hover:not(:disabled) { opacity: 0.75; }
    .add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class BookmarkCardComponent implements OnChanges {
  @Input({ required: true }) list!: BookmarkList;
  @Output() listUpdated = new EventEmitter<BookmarkList>();
  @Output() listDeleted = new EventEmitter<string>();

  protected minimized = false;
  protected colorPickerOpen = false;
  protected confirmingDelete = false;
  protected confirmDeleteBookmark: Bookmark | null = null;
  protected newUrlDraft = '';
  protected adding = false;
  protected editingBookmarkId: string | null = null;
  protected editTitleDraft = '';
  protected editUrlDraft = '';
  private colorDraft = '';
  private textColorDraft: string | null = null;

  constructor(private readonly bookmarkApi: BookmarkApiService) {}

  ngOnChanges(): void {
    this.colorDraft = this.list.color;
    this.textColorDraft = this.list.textColor ?? null;
  }

  protected textColor(): string {
    if (this.list.textColor) return this.list.textColor;
    const bg = this.list.color || '#fffef8';
    if (isGradient(bg)) {
      const first = firstHexFromGradient(bg);
      return first ? autoContrastColor(first) : '#000000';
    }
    return autoContrastColor(bg);
  }

  protected hostname(url: string): string {
    try { return new URL(url).hostname; } catch { return ''; }
  }

  // ── Title editing ───────────────────────────────────────────────────────

  protected onTitleChanged(title: string): void {
    this.bookmarkApi.updateBookmarkList(this.list.id, {
      title, color: this.list.color, textColor: this.list.textColor ?? null
    }).subscribe({ next: updated => this.listUpdated.emit(updated) });
  }

  // ── Color picker ────────────────────────────────────────────────────────

  protected toggleColorPicker(): void {
    this.colorPickerOpen = !this.colorPickerOpen;
    this.colorDraft = this.list.color;
    this.textColorDraft = this.list.textColor ?? null;
  }

  protected onColorChange(color: string): void {
    this.colorDraft = color;
    this.listUpdated.emit({ ...this.list, color });
  }

  protected onTextColorChange(textColor: string | null): void {
    this.textColorDraft = textColor;
    this.listUpdated.emit({ ...this.list, textColor });
  }

  protected saveColor(): void {
    this.colorPickerOpen = false;
    this.bookmarkApi.updateBookmarkList(this.list.id, {
      title: this.list.title, color: this.colorDraft, textColor: this.textColorDraft
    }).subscribe({ next: updated => this.listUpdated.emit(updated) });
  }

  // ── Delete list ─────────────────────────────────────────────────────────

  protected requestDeleteList(): void {
    this.confirmingDelete = true;
  }

  protected onConfirmDeleteList(): void {
    this.bookmarkApi.deleteBookmarkList(this.list.id).subscribe({
      next: () => this.listDeleted.emit(this.list.id)
    });
    this.confirmingDelete = false;
  }

  // ── Add bookmark ────────────────────────────────────────────────────────

  protected addFromInput(): void {
    const url = this.newUrlDraft.trim();
    if (!url) return;
    this.addUrl(url);
    this.newUrlDraft = '';
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (this.isUrl(text)) {
      event.preventDefault();
      this.addUrl(text);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const url = event.dataTransfer?.getData('text/uri-list') ||
                event.dataTransfer?.getData('text/plain') || '';
    if (url.trim()) this.addUrl(url.trim());
  }

  protected onFaviconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // If already on the fallback, give up and hide
    if (img.src.includes('google.com/s2/favicons')) {
      img.style.display = 'none';
      return;
    }
    // Try Google's favicon service using the bookmark's page URL
    try {
      const domain = new URL(img.dataset['url'] ?? '').hostname;
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      img.style.display = 'none';
    }
  }

  private addUrl(url: string): void {
    if (this.adding) return;
    this.adding = true;
    // Fetch metadata then add
    this.bookmarkApi.getMetadata(url).subscribe({
      next: meta => {
        this.bookmarkApi.addBookmark(this.list.id, {
          url, title: meta.title, faviconUrl: meta.faviconUrl
        }).subscribe({
          next: bm => {
            this.listUpdated.emit({ ...this.list, bookmarks: [...this.list.bookmarks, bm] });
            this.adding = false;
          },
          error: () => { this.adding = false; }
        });
      },
      error: () => {
        // Fallback: add without metadata
        this.bookmarkApi.addBookmark(this.list.id, { url, title: this.hostname(url) }).subscribe({
          next: bm => {
            this.listUpdated.emit({ ...this.list, bookmarks: [...this.list.bookmarks, bm] });
            this.adding = false;
          },
          error: () => { this.adding = false; }
        });
      }
    });
  }

  private isUrl(text: string): boolean {
    try { new URL(text); return true; } catch { return false; }
  }

  // ── Bookmark editing ────────────────────────────────────────────────────

  protected startBookmarkEdit(bm: Bookmark): void {
    this.editingBookmarkId = bm.id;
    this.editTitleDraft = bm.title;
    this.editUrlDraft = bm.url;
  }

  protected saveBookmarkEdit(bm: Bookmark): void {
    const url = this.editUrlDraft.trim();
    const title = this.editTitleDraft.trim() || this.hostname(url);
    if (!url) { this.cancelBookmarkEdit(); return; }
    this.bookmarkApi.updateBookmark(this.list.id, bm.id, {
      url, title, faviconUrl: bm.faviconUrl ?? null
    }).subscribe({
      next: updated => {
        this.listUpdated.emit({
          ...this.list,
          bookmarks: this.list.bookmarks.map(b => b.id === updated.id ? updated : b)
        });
        this.editingBookmarkId = null;
      }
    });
  }

  protected cancelBookmarkEdit(): void {
    this.editingBookmarkId = null;
  }

  // ── Delete bookmark ─────────────────────────────────────────────────────

  protected onConfirmDeleteBookmark(): void {
    const bm = this.confirmDeleteBookmark;
    if (!bm) return;
    this.bookmarkApi.deleteBookmark(this.list.id, bm.id).subscribe({
      next: () => this.listUpdated.emit({
        ...this.list,
        bookmarks: this.list.bookmarks.filter(b => b.id !== bm.id)
      })
    });
    this.confirmDeleteBookmark = null;
  }

  // ── Reorder bookmarks ───────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected reorderBookmarks(event: CdkDragDrop<any[]>): void {
    const bookmarks = [...this.list.bookmarks];
    moveItemInArray(bookmarks, event.previousIndex, event.currentIndex);
    this.listUpdated.emit({ ...this.list, bookmarks });
    this.bookmarkApi.reorderBookmarks(this.list.id, bookmarks.map(b => b.id)).subscribe();
  }
}
