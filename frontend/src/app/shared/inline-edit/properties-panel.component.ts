import { Component, HostListener, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardType, ContentCardAdmin } from '../../core/models/content.models';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <button class="props-toggle" type="button" (click)="toggle()">⚙ Properties</button>
    @if (open()) {
      <div class="props-panel" (keydown.escape)="close()">
        <div class="props-panel__row">
          <label>Status</label>
          <div style="display:flex; gap:1rem;">
            <label style="font-size:0.85rem; font-weight:400; display:flex; align-items:center; gap:0.35rem;">
              <input type="radio" name="status" value="DRAFT"
                [checked]="card.status === 'DRAFT'"
                (change)="change.emit({ status: 'DRAFT' })" />
              Draft
            </label>
            <label style="font-size:0.85rem; font-weight:400; display:flex; align-items:center; gap:0.35rem;">
              <input type="radio" name="status" value="PUBLISHED"
                [checked]="card.status === 'PUBLISHED'"
                (change)="change.emit({ status: 'PUBLISHED' })" />
              Published
            </label>
          </div>
        </div>
        <div class="props-panel__row">
          <label>Slug</label>
          <input type="text" [value]="card.slug"
            (change)="change.emit({ slug: $any($event.target).value })" />
          <p class="props-panel__warning">⚠ Changing this breaks incoming links</p>
        </div>
        <div class="props-panel__row">
          <label>Card type</label>
          <select [value]="card.cardType"
            (change)="change.emit({ cardType: $any($event.target).value })">
            @for (type of cardTypes; track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
        </div>
        <div class="props-panel__row">
          <label style="display:flex; align-items:center; gap:0.5rem; flex-direction:row; font-weight:600;">
            <input type="checkbox"
              [checked]="card.simpleLayout"
              (change)="change.emit({ simpleLayout: $any($event.target).checked })" />
            Simple layout
          </label>
        </div>
        <div class="props-panel__danger">
          <button class="btn-delete" type="button" (click)="deleteCard.emit()">Delete card</button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: inline-block;
    }
    .props-toggle {
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      border: 1px solid #9ca3af;
      background: #fff;
      font-size: 0.75rem;
      cursor: pointer;
      color: #374151;
    }
    .props-toggle:hover {
      border-color: #d97706;
      color: #d97706;
    }
    .props-panel {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      width: 280px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      padding: 1rem;
      z-index: 100;
    }
    .props-panel__row {
      margin-bottom: 0.75rem;
    }
    .props-panel__row label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }
    .props-panel__row input[type=text],
    .props-panel__row select {
      width: 100%;
      padding: 0.35rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.35rem;
      font-size: 0.85rem;
      box-sizing: border-box;
    }
    .props-panel__warning {
      font-size: 0.7rem;
      color: #d97706;
      margin-top: 0.25rem;
    }
    .props-panel__danger {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #fee2e2;
    }
    .btn-delete {
      background: #dc2626;
      color: #fff;
      border: none;
      border-radius: 0.4rem;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      cursor: pointer;
    }
  `],
})
export class PropertiesPanelComponent {
  @Input() card!: ContentCardAdmin;
  @Output() change = new EventEmitter<Partial<ContentCardAdmin>>();
  @Output() deleteCard = new EventEmitter<void>();

  protected open = signal(false);
  protected readonly cardTypes: CardType[] = ['ARTICLE', 'INFOGRAPHIC', 'VIDEO', 'TODO_LIST'];

  toggle(): void {
    this.open.update(v => !v);
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }
}
