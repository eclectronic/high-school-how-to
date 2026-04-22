import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RecommendedPinApiService,
  SaveRecommendedPinRequest,
} from '../../core/services/recommended-pin-api.service';
import { RecommendedPin } from '../../core/models/task.models';

@Component({
  selector: 'app-recommended-pins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recommended-pins.component.html',
  styleUrl: './recommended-pins.component.scss',
})
export class RecommendedPinsComponent implements OnInit {
  protected pins = signal<RecommendedPin[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected editingPin = signal<RecommendedPin | null>(null);
  protected showForm = signal(false);

  protected form: SaveRecommendedPinRequest = this.emptyForm();

  constructor(private api: RecommendedPinApiService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.adminList().subscribe({
      next: (pins) => {
        this.pins.set(pins);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load recommended pins');
        this.loading.set(false);
      },
    });
  }

  protected openNew() {
    this.editingPin.set(null);
    this.form = this.emptyForm();
    this.showForm.set(true);
  }

  protected openEdit(pin: RecommendedPin) {
    this.editingPin.set(pin);
    this.form = {
      name: pin.name,
      url: pin.url,
      emoji: pin.emoji ?? null,
      faviconUrl: pin.faviconUrl ?? null,
      category: pin.category ?? null,
      sortOrder: pin.sortOrder,
      active: pin.active,
    };
    this.showForm.set(true);
  }

  protected save() {
    const editing = this.editingPin();
    const obs = editing
      ? this.api.adminUpdate(editing.id, this.form)
      : this.api.adminCreate(this.form);

    obs.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.detail ?? 'Save failed'),
    });
  }

  protected delete(pin: RecommendedPin) {
    if (!confirm(`Delete "${pin.name}"?`)) return;
    this.api.adminDelete(pin.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.detail ?? 'Delete failed'),
    });
  }

  protected cancel() {
    this.showForm.set(false);
    this.error.set(null);
  }

  protected get categories(): string[] {
    const cats = new Set(this.pins().map((p) => p.category ?? ''));
    return [...cats].filter(Boolean).sort();
  }

  protected get hasUncategorized(): boolean {
    return this.pins().some((p) => !p.category);
  }

  private emptyForm(): SaveRecommendedPinRequest {
    return { name: '', url: '', emoji: null, faviconUrl: null, category: null, sortOrder: 0, active: true };
  }
}
