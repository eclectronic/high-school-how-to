import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentApiService } from '../../core/services/content-api.service';
import { Tag, SaveTagRequest } from '../../core/models/content.models';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tag-manager.component.html',
  styleUrl: './tag-manager.component.scss',
})
export class TagManagerComponent implements OnInit {
  protected tags = signal<Tag[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected editingTag = signal<Tag | null>(null);
  protected showForm = signal(false);

  protected form: SaveTagRequest = { name: '', slug: '', description: null, sortOrder: 0 };

  constructor(private api: ContentApiService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.adminListTags().subscribe({
      next: (tags) => {
        this.tags.set(tags.sort((a, b) => a.sortOrder - b.sortOrder));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load tags');
        this.loading.set(false);
      },
    });
  }

  protected openNew() {
    this.editingTag.set(null);
    this.form = { name: '', slug: '', description: null, sortOrder: this.tags().length };
    this.showForm.set(true);
  }

  protected openEdit(tag: Tag) {
    this.editingTag.set(tag);
    this.form = { name: tag.name, slug: tag.slug, description: tag.description, sortOrder: tag.sortOrder };
    this.showForm.set(true);
  }

  protected onNameInput() {
    if (!this.editingTag()) {
      this.form.slug = this.form.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  protected save() {
    const editing = this.editingTag();
    const obs = editing
      ? this.api.adminUpdateTag(editing.id, this.form)
      : this.api.adminCreateTag(this.form);

    obs.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.detail ?? 'Save failed'),
    });
  }

  protected delete(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? Cards with only this tag will need to be reassigned.`)) return;
    this.api.adminDeleteTag(tag.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.detail ?? 'Delete failed'),
    });
  }

  protected cancel() {
    this.showForm.set(false);
    this.error.set(null);
  }
}
