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

      <!-- Edit shortcut shown on hover -->
      <button
        type="button"
        class="sticker-icon__edit-btn"
        aria-label="Edit sticker"
        title="Edit sticker"
        (click)="$event.stopPropagation(); edit.emit()"
      >✎</button>

      <!-- Context menu (right-click / long-press) -->
      @if (menuOpen()) {
        <div class="sticker-icon__menu" (click)="$event.stopPropagation()">
          <button type="button" class="sticker-icon__menu-item" (click)="onMenuEdit()">
            Edit
          </button>
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
        gap: 0.35rem;
        padding: 0.75rem 0.5rem 0.5rem;
        border-radius: 12px;
        cursor: default;
        user-select: none;
      }

      .sticker-icon__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3.5rem;
        height: 3.5rem;
      }

      .sticker-icon__emoji {
        font-size: 2.5rem;
        line-height: 1;
      }

      .sticker-icon__img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
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

      /* Edit button — shown on hover */
      .sticker-icon__edit-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 0.65rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        opacity: 0;
        transition: opacity 150ms ease;
        pointer-events: none;
      }

      .sticker-icon:hover .sticker-icon__edit-btn,
      .sticker-icon--menu-open .sticker-icon__edit-btn {
        opacity: 1;
        pointer-events: auto;
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

  readonly edit = output<void>();
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

  protected onMenuEdit(): void {
    this.menuOpen.set(false);
    this.edit.emit();
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
