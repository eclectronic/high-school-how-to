import { Component, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

const PIN_EMOJIS = [
  '📧', '📁', '🔍', '🎵', '📺', '💻', '🛒', '📰',
  '🎮', '🎬', '📷', '📱', '🗺️', '✈️', '🏠', '💼',
  '📚', '🎓', '💡', '📊', '🔗', '⭐', '❤️', '🏆',
  '🛡️', '🔔', '📅', '💬', '🌐', '🎯', '🧪', '🎨',
];

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="emoji-picker">
      @for (emoji of emojis; track emoji) {
        <button
          type="button"
          class="emoji-picker__btn"
          [title]="emoji"
          (click)="select(emoji)"
        >{{ emoji }}</button>
      }
      <button type="button" class="emoji-picker__clear" (click)="select(null)">✕ Clear</button>
    </div>
  `,
  styles: [`
    .emoji-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      padding: 6px;
      background: #fffef8;
      border: 1px solid rgba(45, 26, 16, 0.15);
      border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
      width: 230px;
    }

    .emoji-picker__btn {
      width: 34px;
      height: 34px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.1s;

      &:hover {
        background: rgba(45, 26, 16, 0.08);
      }
    }

    .emoji-picker__clear {
      width: 100%;
      border: none;
      background: transparent;
      font-size: 0.75rem;
      color: rgba(45, 26, 16, 0.5);
      cursor: pointer;
      padding: 4px 6px;
      text-align: left;
      border-radius: 6px;
      font-family: inherit;
      margin-top: 2px;

      &:hover {
        background: rgba(45, 26, 16, 0.06);
        color: #2d1a10;
      }
    }
  `],
})
export class EmojiPickerComponent {
  @Output() emojiSelected = new EventEmitter<string | null>();
  @Output() dismissed = new EventEmitter<void>();

  protected readonly emojis = PIN_EMOJIS;

  private readonly elRef = inject(ElementRef);

  protected select(emoji: string | null): void {
    this.emojiSelected.emit(emoji);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.dismissed.emit();
    }
  }
}
