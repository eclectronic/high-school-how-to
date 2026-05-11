import { Component, inject } from '@angular/core';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

@Component({
  selector: 'app-edit-mode-toggle',
  standalone: true,
  template: `
    @if (isAdmin()) {
      <button
        class="edit-mode-toggle"
        [class.edit-mode-toggle--on]="editMode.enabled()"
        (click)="editMode.toggle()"
        [title]="editMode.enabled() ? 'Exit edit mode' : 'Enter edit mode'"
        [attr.aria-pressed]="editMode.enabled()">
        {{ editMode.enabled() ? '✏ Editing' : '✏ Edit' }}
      </button>
    }
  `,
  styles: [`
    .edit-mode-toggle {
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      border: 2px solid #d97706;
      background: transparent;
      color: #d97706;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .edit-mode-toggle--on {
      background: #d97706;
      color: #fff;
    }
    .edit-mode-toggle:hover {
      background: #d97706;
      color: #fff;
    }
  `],
})
export class EditModeToggleComponent {
  protected readonly editMode = inject(EditModeStore);
  protected readonly isAdmin = inject(SessionStore).isAdmin;
}
