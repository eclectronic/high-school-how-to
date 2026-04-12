import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

const EMOJI_SECTIONS: { label: string; emojis: string[] }[] = [
  {
    label: 'School',
    emojis: ['📚', '📖', '✏️', '📝', '🖊️', '📐', '📏', '🔬', '🔭', '🖥️', '💻', '🎓', '🏫', '📊', '📈', '💡', '🧠', '🧪', '🧲', '⚗️'],
  },
  {
    label: 'Fun',
    emojis: ['⭐', '🌟', '✨', '🎉', '🎊', '🏆', '🥇', '🎯', '🎮', '🎵', '🎨', '🎭', '🍕', '🍦', '🍎', '🌈', '🦄', '🐱', '🐶', '🌸'],
  },
  {
    label: 'Mood',
    emojis: ['😀', '😎', '🤓', '😤', '😩', '💪', '🙌', '👍', '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '😴', '🥳', '😅', '🫶'],
  },
  {
    label: 'Nature',
    emojis: ['🌿', '🌺', '🌻', '🍀', '🌙', '☀️', '🌊', '🌋', '🌴', '🍃', '🌾', '🦋', '🐝', '🐉', '🦊', '🐧', '🌍', '🪐', '🌠', '❄️'],
  },
];

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="emoji-picker" [class.emoji-picker--inline]="inline()" (click)="$event.stopPropagation()">
      @for (section of sections; track section.label) {
        <div class="emoji-picker__section">
          <div class="emoji-picker__label">{{ section.label }}</div>
          <div class="emoji-picker__grid">
            @for (emoji of section.emojis; track emoji) {
              <button
                type="button"
                class="emoji-picker__btn"
                draggable="true"
                (click)="emojiSelected.emit(emoji)"
                (dragstart)="onDragStart($event, emoji)"
                [title]="emoji"
                aria-label="{{ emoji }}"
              >{{ emoji }}</button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .emoji-picker {
      background: #fff;
      border: 1.5px solid #e0d8d0;
      border-radius: 12px;
      padding: 0.75rem;
      width: 260px;
      max-height: 340px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    /* Inline mode: fills its container, no popup chrome */
    .emoji-picker--inline {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      width: 100%;
      max-height: none;
      overflow-y: visible;
      box-shadow: none;
    }

    .emoji-picker__section { margin-bottom: 0.5rem; }

    .emoji-picker__label {
      font-size: 0.7rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .emoji-picker__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
      gap: 2px;
    }

    .emoji-picker__btn {
      width: 100%;
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 100ms ease;

      &:hover { background: #f0ebe5; }
    }
  `],
})
export class EmojiPickerComponent {
  readonly sections = EMOJI_SECTIONS;
  readonly inline = input(false);
  readonly emojiSelected = output<string>();

  /** Drag payload key for emojis dropped from this picker into the locker grid. */
  static readonly DRAG_MIME = 'application/x-locker-sticker-emoji';

  protected onDragStart(event: DragEvent, emoji: string): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(EmojiPickerComponent.DRAG_MIME, emoji);
    // Fallback for browsers that ignore custom MIME types in tests.
    event.dataTransfer.setData('text/plain', emoji);
    event.dataTransfer.effectAllowed = 'copy';
  }
}
