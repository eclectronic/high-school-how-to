import { Component, HostListener, Input, Output, EventEmitter, signal } from '@angular/core';
import { Tag } from '../../core/models/content.models';

@Component({
  selector: 'app-topic-chips',
  standalone: true,
  template: `
    <div class="topic-strip" (click)="closePicker()">
      <span class="topic-strip__label">Topics</span>
      @for (tag of tags; track tag.id) {
        <span class="topic-strip__chip">
          {{ tag.name }}
          <button type="button" class="topic-strip__remove"
                  (click)="$event.stopPropagation(); removeTag(tag.id)"
                  [attr.aria-label]="'Remove topic ' + tag.name">×</button>
        </span>
      }
      <div class="topic-strip__add-wrap" (click)="$event.stopPropagation()">
        <button type="button" class="topic-strip__add-btn"
                (click)="togglePicker($event)">+ Add topic</button>
        @if (topicPickerOpen()) {
          <div class="topic-strip__dropdown">
            @for (tag of unassignedTopics; track tag.id) {
              <button type="button" class="topic-strip__option"
                      (click)="addTag(tag)">{{ tag.name }}</button>
            } @empty {
              <span class="topic-strip__empty">All topics assigned</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .topic-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1.25rem;
      background: rgba(255, 254, 249, 0.9);
      border: 2px solid rgba(45, 26, 16, 0.1);
      border-radius: 1rem;
      box-shadow: 0 4px 12px rgba(45, 26, 16, 0.08);
    }
    .topic-strip__label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #8f7f73;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-right: 0.2rem;
      white-space: nowrap;
    }
    .topic-strip__chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.22rem 0.45rem 0.22rem 0.65rem;
      background: rgba(255, 92, 119, 0.1);
      border: 1.5px solid rgba(255, 92, 119, 0.35);
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #c0392b;
    }
    .topic-strip__remove {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      color: rgba(192, 57, 43, 0.5);
      padding: 0;
      line-height: 1;
      display: flex;
      align-items: center;
      font-family: inherit;
      transition: color 0.12s;
    }
    .topic-strip__remove:hover { color: #c0392b; }
    .topic-strip__add-wrap {
      position: relative;
    }
    .topic-strip__add-btn {
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
      border: 1.5px dashed rgba(45, 26, 16, 0.28);
      background: transparent;
      font-size: 0.82rem;
      font-weight: 600;
      color: #5f4f43;
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.12s, color 0.12s;
    }
    .topic-strip__add-btn:hover {
      border-color: #ff9966;
      color: #2d1a10;
    }
    .topic-strip__dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 200;
      background: #fff;
      border: 1px solid rgba(45, 26, 16, 0.15);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(45, 26, 16, 0.12);
      min-width: 140px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .topic-strip__option {
      padding: 0.48rem 0.85rem;
      background: none;
      border: none;
      text-align: left;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      color: #2d1a10;
      cursor: pointer;
      transition: background 0.1s;
    }
    .topic-strip__option:hover { background: #f0e8d8; }
    .topic-strip__empty {
      padding: 0.48rem 0.85rem;
      font-size: 0.82rem;
      color: #8f7f73;
      font-style: italic;
    }
  `],
})
export class TopicChipsComponent {
  @Input() tags: Tag[] = [];
  @Input() allTags: Tag[] = [];
  @Output() change = new EventEmitter<Tag[]>();

  protected topicPickerOpen = signal(false);

  protected get unassignedTopics(): Tag[] {
    const assignedIds = new Set(this.tags.map((t) => t.id));
    return this.allTags.filter((t) => !assignedIds.has(t.id));
  }

  protected removeTag(tagId: number): void {
    this.change.emit(this.tags.filter((t) => t.id !== tagId));
  }

  protected addTag(tag: Tag): void {
    this.change.emit([...this.tags, tag]);
    this.topicPickerOpen.set(false);
  }

  protected togglePicker(event: MouseEvent): void {
    event.stopPropagation();
    this.topicPickerOpen.update((v) => !v);
  }

  protected closePicker(): void {
    this.topicPickerOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.topicPickerOpen.set(false);
  }

  // Stop Escape from bubbling to the global keydown handler when the picker is
  // open — otherwise it triggers discardAndExit on the parent page.
  @HostListener('keydown', ['$event'])
  onHostKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.topicPickerOpen()) {
      event.stopPropagation();
      this.topicPickerOpen.set(false);
    }
  }
}
