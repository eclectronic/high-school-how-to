import {
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sticker } from '../../core/models/task.models';

@Component({
  selector: 'app-sticker-icon',
  standalone: true,
  imports: [CommonModule],
  host: { '[class.sticker-menu-open]': 'menuOpen()' },
  template: `
    <div
      class="sticker-icon"
      [class.sticker-icon--menu-open]="menuOpen()"
      (contextmenu)="onContextMenu($event)"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
      (touchmove)="onTouchMove()"
    >
      <!-- Icon area -->
      <div class="sticker-icon__icon">
        @if (sticker().emoji) {
          <span class="sticker-icon__emoji" aria-hidden="true">{{ sticker().emoji }}</span>
        } @else if (sticker().iconUrl) {
          <img
            class="sticker-icon__img"
            [src]="sticker().iconUrl!"
            [alt]="sticker().label ?? 'Sticker'"
          />
        }
      </div>

      <!-- Label -->
      @if (sticker().label) {
        <p class="sticker-icon__label" [title]="sticker().label!">{{ sticker().label }}</p>
      }

      <!-- Delete button shown on hover -->
      <div class="sticker-icon__actions">
        <button
          type="button"
          class="sticker-icon__action-btn sticker-icon__action-btn--delete"
          aria-label="Delete sticker"
          title="Delete sticker"
          (click)="$event.stopPropagation(); delete.emit()"
        >✕</button>
      </div>

      <!-- Context menu (right-click / long-press) -->
      @if (menuOpen()) {
        <div class="sticker-icon__menu" (click)="$event.stopPropagation()">
          <button type="button" class="sticker-icon__menu-item sticker-icon__menu-item--danger" (click)="onMenuDelete()">
            Delete
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sticker-icon {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        /* Fill whatever dimensions the parent grid-widget provides.
           aspect-ratio removed so explicit height from resize is respected. */
        width: 100%;
        height: 100%;
        padding: 0;
        cursor: default;
        user-select: none;
      }

      .sticker-icon__icon {
        container-type: size;
        width: 100%;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .sticker-icon__emoji {
        font-size: 80cqi;
        line-height: 1;
      }

      .sticker-icon__img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .sticker-icon__label {
        margin: 0;
        font-size: 0.72rem;
        font-weight: 600;
        text-align: center;
        max-width: 6rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: inherit;
        opacity: 0.75;
      }

      /* Edit / delete buttons — shown on hover */
      .sticker-icon__actions {
        position: absolute;
        top: 2px;
        right: 2px;
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 150ms ease;
        pointer-events: none;
        /* Must sit above the locker's resize handles (z-index: 20) */
        z-index: 30;
      }

      .sticker-icon:hover .sticker-icon__actions,
      .sticker-icon--menu-open .sticker-icon__actions {
        opacity: 1;
        pointer-events: auto;
      }

      .sticker-icon__action-btn {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 0.6rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }

      .sticker-icon__action-btn--delete {
        background: rgba(180, 0, 0, 0.7);
      }

      /* Context menu */
      .sticker-icon__menu {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        z-index: 50;
        background: #fff;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        overflow: hidden;
        min-width: 100px;
      }

      .sticker-icon__menu-item {
        display: block;
        width: 100%;
        padding: 0.5rem 0.85rem;
        border: none;
        background: transparent;
        text-align: left;
        font: inherit;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        color: #1c1c1e;
        transition: background 0.1s;
      }

      .sticker-icon__menu-item:hover {
        background: rgba(0, 0, 0, 0.06);
      }

      .sticker-icon__menu-item--danger {
        color: #b91c1c;
      }

      .sticker-icon__menu-item--danger:hover {
        background: rgba(185, 28, 28, 0.08);
      }
    `,
  ],
})
export class StickerIconComponent implements OnDestroy {
  readonly sticker = input.required<Sticker>();

  readonly delete = output<void>();

  protected readonly menuOpen = signal(false);

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private touchMoved = false;

  private readonly closeMenuOnOutsideClick = (event: MouseEvent) => {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
    }
  };

  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.openMenu();
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchMoved = false;
    this.longPressTimer = setTimeout(() => {
      if (!this.touchMoved) {
        this.openMenu();
        event.preventDefault();
      }
    }, 500);
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  protected onTouchMove(): void {
    this.touchMoved = true;
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  protected onMenuDelete(): void {
    this.menuOpen.set(false);
    this.delete.emit();
  }

  private openMenu(): void {
    this.menuOpen.set(true);
    // Close on next outside click
    setTimeout(() => {
      window.addEventListener('click', this.closeMenuOnOutsideClick, { once: true });
    });
  }

  ngOnDestroy(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
    }
    window.removeEventListener('click', this.closeMenuOnOutsideClick);
  }
}
