import { Component, output } from '@angular/core';
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
    <div class="emoji-picker" (click)="$event.stopPropagation()">
      @for (section of sections; track section.label) {
        <div class="emoji-picker__section">
          <div class="emoji-picker__label">{{ section.label }}</div>
          <div class="emoji-picker__grid">
            @for (emoji of section.emojis; track emoji) {
              <button
                type="button"
                class="emoji-picker__btn"
                (click)="emojiSelected.emit(emoji)"
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
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }

    .emoji-picker__btn {
      width: 34px;
      height: 34px;
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
  readonly emojiSelected = output<string>();
}
