import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Shortcut } from '../../core/models/task.models';

@Component({
  selector: 'app-shortcut-icon',
  standalone: true,
  imports: [CommonModule],
  host: { '[class.shortcut-menu-open]': 'contextMenuOpen' },
  template: `
    <div class="shortcut"
         [title]="shortcut.name"
         (click)="openUrl($event)"
         (contextmenu)="onContextMenu($event)">

      <!-- Hover edit pencil -->
      <button type="button"
              class="shortcut__edit-btn"
              title="Edit shortcut"
              aria-label="Edit shortcut"
              (click)="onEditClick($event)">✏️</button>

      <!-- Icon area -->
      <div class="shortcut__icon-wrap">
        <img *ngIf="shortcut.iconUrl"
             class="shortcut__img"
             [src]="shortcut.iconUrl"
             [alt]="shortcut.name"
             (error)="onImgError($event)" />
        <span *ngIf="!shortcut.iconUrl && shortcut.emoji"
              class="shortcut__emoji">{{ shortcut.emoji }}</span>
        <img *ngIf="!shortcut.iconUrl && !shortcut.emoji && shortcut.faviconUrl"
             class="shortcut__favicon"
             [src]="shortcut.faviconUrl"
             [alt]="shortcut.name"
             (error)="onFaviconError($event)" />
        <span *ngIf="!shortcut.iconUrl && !shortcut.emoji && (!shortcut.faviconUrl || faviconFailed)"
              class="shortcut__default-icon"
              aria-hidden="true">🔗</span>
      </div>

      <!-- Label -->
      <span class="shortcut__label">{{ shortcut.name }}</span>

      <!-- Context menu -->
      <div *ngIf="contextMenuOpen"
           class="shortcut__context-menu"
           (click)="$event.stopPropagation()">
        <button type="button" (click)="onContextEdit()">✏️ Edit</button>
        <button type="button" class="danger" (click)="onContextDelete()">🗑 Delete</button>
      </div>
    </div>
  `,
  styles: [
    `
      .shortcut {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 12px;
        transition: background 0.12s;
        user-select: none;
        -webkit-user-select: none;
      }

      .shortcut:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .shortcut__icon-wrap {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.85);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        overflow: hidden;
      }

      .shortcut__img,
      .shortcut__favicon {
        width: 32px;
        height: 32px;
        object-fit: contain;
        border-radius: 6px;
      }

      .shortcut__emoji {
        font-size: 1.8rem;
        line-height: 1;
      }

      .shortcut__default-icon {
        font-size: 1.6rem;
        line-height: 1;
      }

      .shortcut__label {
        font-size: 0.72rem;
        font-weight: 600;
        text-align: center;
        max-width: 72px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: inherit;
        line-height: 1.2;
      }

      /* Edit pencil — only visible on hover */
      .shortcut__edit-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 22px;
        height: 22px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        font-size: 0.65rem;
        opacity: 0;
        transition: opacity 0.12s;
        z-index: 2;
      }

      .shortcut:hover .shortcut__edit-btn {
        opacity: 1;
      }

      /* Context menu */
      .shortcut__context-menu {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        background: #fffef8;
        border: 1px solid rgba(45, 26, 16, 0.15);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        min-width: 130px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .shortcut__context-menu button {
        background: transparent;
        border: none;
        border-radius: 0;
        padding: 0.55rem 1rem;
        text-align: left;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        color: #2d1a10;
        font-family: inherit;
        transition: background 0.1s;
      }

      .shortcut__context-menu button:hover {
        background: rgba(0, 0, 0, 0.06);
      }

      .shortcut__context-menu button.danger {
        color: #b00020;
      }
    `,
  ],
})
export class ShortcutIconComponent {
  @Input({ required: true }) shortcut!: Shortcut;

  @Output() editRequested = new EventEmitter<Shortcut>();
  @Output() deleteRequested = new EventEmitter<Shortcut>();

  protected contextMenuOpen = false;
  protected faviconFailed = false;

  protected openUrl(event: Event): void {
    event.stopPropagation();
    if (this.contextMenuOpen) {
      this.contextMenuOpen = false;
      return;
    }
    window.open(this.shortcut.url, '_blank', 'noopener,noreferrer');
  }

  protected onEditClick(event: Event): void {
    event.stopPropagation();
    this.contextMenuOpen = false;
    this.editRequested.emit(this.shortcut);
  }

  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuOpen = !this.contextMenuOpen;
  }

  protected onContextEdit(): void {
    this.contextMenuOpen = false;
    this.editRequested.emit(this.shortcut);
  }

  protected onContextDelete(): void {
    this.contextMenuOpen = false;
    this.deleteRequested.emit(this.shortcut);
  }

  protected onFaviconError(_event: Event): void {
    this.faviconFailed = true;
  }

  protected onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.contextMenuOpen = false;
  }
}
