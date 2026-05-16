import { Component, inject } from '@angular/core';
import { EditModeStore } from '../../core/edit-mode/edit-mode.store';
import { SessionStore } from '../../core/session/session.store';

@Component({
  selector: 'app-edit-mode-banner',
  standalone: true,
  template: `
    @if (isAdmin() && editMode.enabled()) {
      <div class="edit-mode-banner" role="status">
        ✏ Edit mode — changes are live
      </div>
    }
  `,
  styles: [`
    .edit-mode-banner {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #fef3c7;
      border-bottom: 2px solid #d97706;
      text-align: center;
      padding: 0.35rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #92400e;
    }
  `],
})
export class EditModeBannerComponent {
  protected readonly editMode = inject(EditModeStore);
  protected readonly isAdmin = inject(SessionStore).isAdmin;
}
