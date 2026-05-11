import { Component, inject } from '@angular/core';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

@Component({
  selector: 'app-edit-mode-bar',
  standalone: true,
  template: `
    @if (isAdmin() && editMode.isDirty()) {
      <div class="edit-mode-bar">
        <span class="edit-mode-bar__label">Unsaved changes</span>
        @if (editMode.lastError()) {
          <span class="edit-mode-bar__error">{{ editMode.lastError() }}</span>
        }
        <button class="edit-mode-bar__btn edit-mode-bar__btn--discard" (click)="editMode.discard()">
          Discard
        </button>
        <button class="edit-mode-bar__btn edit-mode-bar__btn--save" (click)="editMode.requestSave()">
          Save
        </button>
      </div>
    }
  `,
  styles: [`
    .edit-mode-bar {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 2000;
      background: #fff;
      border: 2px solid #d97706;
      border-radius: 0.75rem;
      padding: 0.6rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .edit-mode-bar__label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #92400e;
    }
    .edit-mode-bar__error {
      font-size: 0.8rem;
      color: #dc2626;
    }
    .edit-mode-bar__btn {
      padding: 0.35rem 0.9rem;
      border-radius: 0.5rem;
      border: none;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .edit-mode-bar__btn--discard {
      background: #f3f4f6;
      color: #374151;
    }
    .edit-mode-bar__btn--save {
      background: #d97706;
      color: #fff;
    }
    .edit-mode-bar__btn--save:hover {
      background: #b45309;
    }
  `],
})
export class EditModeBarComponent {
  protected readonly editMode = inject(EditModeStore);
  protected readonly isAdmin = inject(SessionStore).isAdmin;
}
