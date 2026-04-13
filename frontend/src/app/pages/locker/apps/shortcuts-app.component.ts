import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShortcutApiService, CreateShortcutRequest } from '../../../core/services/shortcut-api.service';
import { Shortcut } from '../../../core/models/task.models';

@Component({
  selector: 'app-shortcuts-app',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shortcuts-app.component.html',
  styleUrl: './shortcuts-app.component.scss',
})
export class ShortcutsAppComponent implements OnInit {
  @Input() paletteColor = '#888';

  private readonly shortcutApi = inject(ShortcutApiService);

  protected shortcuts = signal<Shortcut[]>([]);
  protected showAddForm = signal(false);
  protected newUrl = '';
  protected newName = '';
  protected adding = signal(false);
  protected editingId = signal<string | null>(null);
  protected editUrl = '';
  protected editName = '';

  ngOnInit(): void {
    this.shortcutApi.getShortcuts().subscribe({
      next: s => this.shortcuts.set(s),
    });
  }

  protected openShortcut(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected openAddForm(): void {
    this.newUrl = '';
    this.newName = '';
    this.showAddForm.set(true);
    this.editingId.set(null);
  }

  protected cancelAdd(): void {
    this.showAddForm.set(false);
  }

  protected submitAdd(): void {
    const url = this.newUrl.trim();
    if (!url) return;
    this.adding.set(true);
    const req: CreateShortcutRequest = { url, name: this.newName.trim() || url };
    this.shortcutApi.createShortcut(req).subscribe({
      next: s => {
        this.shortcuts.update(list => [...list, s]);
        this.showAddForm.set(false);
        this.adding.set(false);
        this.newUrl = '';
        this.newName = '';
      },
      error: () => this.adding.set(false),
    });
  }

  protected startEdit(sc: Shortcut): void {
    this.editingId.set(sc.id);
    this.editUrl = sc.url;
    this.editName = sc.name;
    this.showAddForm.set(false);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected submitEdit(): void {
    const id = this.editingId();
    if (!id) return;
    const url = this.editUrl.trim();
    if (!url) return;
    this.shortcutApi.updateShortcut(id, { url, name: this.editName.trim() || url }).subscribe({
      next: updated => {
        this.shortcuts.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.editingId.set(null);
      },
    });
  }

  protected deleteShortcut(id: string): void {
    this.shortcutApi.deleteShortcut(id).subscribe({
      next: () => this.shortcuts.update(list => list.filter(s => s.id !== id)),
    });
  }

  protected getFaviconSrc(sc: Shortcut): string {
    if (sc.iconUrl) return sc.iconUrl;
    if (sc.faviconUrl) return sc.faviconUrl;
    try {
      return `${new URL(sc.url).origin}/favicon.ico`;
    } catch {
      return '';
    }
  }
}
