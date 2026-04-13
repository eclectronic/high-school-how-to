import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShortcutApiService, CreateShortcutRequest } from '../../../core/services/shortcut-api.service';
import { Shortcut } from '../../../core/models/task.models';
import { ShortcutIconComponent } from '../../../shared/shortcut-icon/shortcut-icon.component';

@Component({
  selector: 'app-shortcuts-row',
  standalone: true,
  imports: [CommonModule, FormsModule, ShortcutIconComponent],
  templateUrl: './shortcuts-row.component.html',
  styleUrl: './shortcuts-row.component.scss',
})
export class ShortcutsRowComponent implements OnInit {
  @Input() editMode = false;

  private readonly shortcutApi = inject(ShortcutApiService);

  protected shortcuts = signal<Shortcut[]>([]);
  protected showAddForm = signal(false);
  protected newUrl = '';
  protected newName = '';
  protected adding = signal(false);

  protected editingShortcut = signal<Shortcut | null>(null);
  protected editUrl = '';
  protected editName = '';

  ngOnInit(): void {
    this.loadShortcuts();
  }

  private loadShortcuts(): void {
    this.shortcutApi.getShortcuts().subscribe({
      next: s => this.shortcuts.set(s),
    });
  }

  protected openAddForm(): void {
    this.newUrl = '';
    this.newName = '';
    this.showAddForm.set(true);
  }

  protected cancelAdd(): void {
    this.showAddForm.set(false);
  }

  protected submitAdd(): void {
    const url = this.newUrl.trim();
    if (!url) return;

    const name = this.newName.trim() || url;
    this.adding.set(true);

    const req: CreateShortcutRequest = { url, name };
    this.shortcutApi.createShortcut(req).subscribe({
      next: shortcut => {
        this.shortcuts.update(list => [...list, shortcut]);
        this.showAddForm.set(false);
        this.adding.set(false);
        this.newUrl = '';
        this.newName = '';
      },
      error: () => this.adding.set(false),
    });
  }

  protected deleteShortcut(shortcut: Shortcut): void {
    this.shortcutApi.deleteShortcut(shortcut.id).subscribe({
      next: () => this.shortcuts.update(list => list.filter(s => s.id !== shortcut.id)),
    });
  }

  protected onEditRequested(shortcut: Shortcut): void {
    this.editingShortcut.set(shortcut);
    this.editUrl = shortcut.url;
    this.editName = shortcut.name;
  }

  protected cancelEdit(): void {
    this.editingShortcut.set(null);
  }

  protected submitEdit(): void {
    const sc = this.editingShortcut();
    if (!sc) return;
    const url = this.editUrl.trim();
    const name = this.editName.trim() || url;
    if (!url) return;

    this.shortcutApi.updateShortcut(sc.id, { url, name }).subscribe({
      next: updated => {
        this.shortcuts.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.editingShortcut.set(null);
      },
    });
  }
}
