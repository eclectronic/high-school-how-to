import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sticker } from '../../core/models/task.models';

const SIZES: Record<string, number> = { small: 3.6, medium: 5.5, large: 8 };
const SIZE_ORDER: Sticker['size'][] = ['small', 'medium', 'large'];
const SIZE_LABEL: Record<string, string> = { small: 'S', medium: 'M', large: 'L' };

@Component({
  selector: 'app-sticker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #stickerEl
      class="sticker"
      [class.sticker--confirming]="confirming()"
      [style.left.px]="sticker().positionX"
      [style.top.px]="sticker().positionY"
      [style.font-size.rem]="sizeRem()"
      (mousedown)="onMouseDown($event)"
      (touchstart)="onTouchStart($event)"
    >
      <span class="sticker__emoji">{{ sticker().emoji }}</span>

      <!-- Controls — visible on hover -->
      <div class="sticker__controls">
        <button
          class="sticker__btn sticker__btn--size"
          type="button"
          [title]="'Size: ' + sticker().size + ' (click to resize)'"
          (mousedown)="$event.stopPropagation()"
          (click)="onSizeClick($event)"
        >{{ sizeLabel() }}</button>
        <button
          class="sticker__btn sticker__btn--delete"
          type="button"
          aria-label="Delete sticker"
          title="Delete sticker"
          (mousedown)="$event.stopPropagation()"
          (click)="onDeleteClick($event)"
        >✕</button>
      </div>

      <!-- Confirm prompt -->
      @if (confirming()) {
        <div class="sticker__confirm" (mousedown)="$event.stopPropagation()">
          <button type="button" class="sticker__confirm-yes" (click)="onConfirmDelete($event)">Delete</button>
          <button type="button" class="sticker__confirm-no" (click)="confirming.set(false)">Cancel</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .sticker {
      position: absolute;
      cursor: grab;
      user-select: none;
      touch-action: none;
      line-height: 1;
      z-index: 1;
    }


    .sticker__emoji { display: block; }

    /* Controls row — hidden until hover */
    .sticker__controls {
      position: absolute;
      top: -10px;
      right: -10px;
      display: flex;
      gap: 3px;
      opacity: 0;
      transition: opacity 150ms ease;
      pointer-events: none;
    }

    .sticker:hover .sticker__controls,
    .sticker--confirming .sticker__controls {
      opacity: 1;
      pointer-events: all;
    }

    .sticker__btn {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: none;
      font-size: 0.55rem;
      line-height: 1;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .sticker__btn--size {
      background: rgba(0,0,0,0.6);
      color: #fff;
    }

    .sticker__btn--delete {
      background: #c00;
      color: #fff;
    }

    /* Confirm prompt */
    .sticker__confirm {
      position: absolute;
      top: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      white-space: nowrap;
      z-index: 20;
    }

    .sticker__confirm-yes,
    .sticker__confirm-no {
      border: none;
      border-radius: 5px;
      padding: 3px 8px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }

    .sticker__confirm-yes { background: #c00; color: #fff; }
    .sticker__confirm-no  { background: #f0f0f0; color: #333; }
  `],
})
export class StickerComponent implements OnDestroy {
  readonly sticker = input.required<Sticker>();

  readonly positionChanged = output<{ x: number; y: number }>();
  readonly sizeChanged = output<string>();
  readonly deleted = output<void>();

  @ViewChild('stickerEl') stickerEl!: ElementRef<HTMLDivElement>;

  protected confirming = signal(false);

  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private origX = 0;
  private origY = 0;

  protected sizeRem(): number {
    return SIZES[this.sticker().size] ?? SIZES['medium'];
  }

  protected sizeLabel(): string {
    return SIZE_LABEL[this.sticker().size] ?? 'M';
  }

  protected onSizeClick(event: Event): void {
    event.stopPropagation();
    const current = this.sticker().size as Sticker['size'];
    const idx = SIZE_ORDER.indexOf(current);
    const next = SIZE_ORDER[(idx + 1) % SIZE_ORDER.length];
    this.sizeChanged.emit(next);
  }

  protected onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.confirming.set(true);
  }

  protected onConfirmDelete(event: Event): void {
    event.stopPropagation();
    this.deleted.emit();
  }

  protected onMouseDown(event: MouseEvent): void {
    if (this.confirming()) return;
    if (event.button !== 0) return;
    this.startDrag(event.clientX, event.clientY);
    const onMove = (e: MouseEvent) => this.moveDrag(e.clientX, e.clientY);
    const onUp = () => {
      this.endDrag();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    event.preventDefault();
  }

  protected onTouchStart(event: TouchEvent): void {
    if (this.confirming()) return;
    const touch = event.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
    const onMove = (e: TouchEvent) => this.moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    const onEnd = () => {
      this.endDrag();
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    event.preventDefault();
  }

  private startDrag(clientX: number, clientY: number): void {
    this.dragging = true;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.origX = this.sticker().positionX;
    this.origY = this.sticker().positionY;
    if (this.stickerEl?.nativeElement) {
      this.stickerEl.nativeElement.style.cursor = 'grabbing';
    }
  }

  private moveDrag(clientX: number, clientY: number): void {
    if (!this.dragging) return;
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    this.positionChanged.emit({ x: Math.max(0, this.origX + dx), y: Math.max(0, this.origY + dy) });
  }

  private endDrag(): void {
    this.dragging = false;
    if (this.stickerEl?.nativeElement) {
      this.stickerEl.nativeElement.style.cursor = 'grab';
    }
  }

  ngOnDestroy(): void {}
}
