import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HomeLayoutApiService } from '../../core/services/home-layout-api.service';
import { HomeSectionRequest } from '../../core/models/home-layout.models';

interface HomeSectionDraft {
  id: number;
  layout: 'full' | 'split';
  slot1Tag: string;
  slot2Tag: string | null;
}

@Component({
  selector: 'app-home-layout',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home-layout.component.html',
  styleUrl: './home-layout.component.scss',
})
export class HomeLayoutComponent implements OnInit {
  protected sections = signal<HomeSectionDraft[]>([]);
  protected saving = signal(false);
  protected saved = signal(false);
  protected error = signal<string | null>(null);

  private nextId = 1;

  constructor(private api: HomeLayoutApiService) {}

  ngOnInit(): void {
    this.api.adminList().subscribe({
      next: (sections) => {
        this.sections.set(
          sections.map((s) => ({
            id: this.nextId++,
            layout: s.layout,
            slot1Tag: s.slot1Tag,
            slot2Tag: s.slot2Tag,
          })),
        );
      },
      error: () => {
        this.error.set('Failed to load layout');
      },
    });
  }

  protected addSection(): void {
    this.sections.update((prev) => [
      ...prev,
      { id: this.nextId++, layout: 'full', slot1Tag: '', slot2Tag: null },
    ]);
  }

  protected removeSection(index: number): void {
    this.sections.update((prev) => prev.filter((_, i) => i !== index));
  }

  protected moveUp(index: number): void {
    if (index === 0) return;
    this.sections.update((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  }

  protected moveDown(index: number): void {
    this.sections.update((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  }

  protected setLayout(index: number, layout: 'full' | 'split'): void {
    this.sections.update((prev) => {
      const updated = [...prev];
      const section = { ...updated[index], layout };
      if (layout === 'full') {
        section.slot2Tag = null;
      } else if (layout === 'split' && section.slot2Tag === null) {
        section.slot2Tag = '';
      }
      updated[index] = section;
      return updated;
    });
  }

  protected save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const requests: HomeSectionRequest[] = this.sections().map((s) => ({
      layout: s.layout,
      slot1Tag: s.slot1Tag,
      slot2Tag: s.slot2Tag,
    }));

    this.api.adminSave(requests).subscribe({
      next: (saved) => {
        this.sections.set(
          saved.map((s) => ({
            id: this.nextId++,
            layout: s.layout,
            slot1Tag: s.slot1Tag,
            slot2Tag: s.slot2Tag,
          })),
        );
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      },
      error: () => {
        this.error.set('Failed to save layout');
        this.saving.set(false);
      },
    });
  }
}
