import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BadgeApiService, SaveBadgeRequest } from '../../core/services/badge-api.service';
import { ContentApiService } from '../../core/services/content-api.service';
import { Badge, BadgeTriggerType } from '../../core/models/task.models';
import { ContentCardAdmin } from '../../core/models/content.models';

const TRIGGER_LABELS: Record<BadgeTriggerType, string> = {
  CHECKLIST_COMPLETE: 'Checklist Complete',
  FIRST_TODO_LIST: 'First To-Do List',
  FIRST_SHORTCUT: 'First Shortcut',
  FIRST_TIMER: 'First Timer',
  FIRST_NOTE: 'First Note',
  FIRST_STICKER: 'First Sticker',
  FIRST_STUDY_SESSION: 'First Study Session',
};

const TRIGGER_TYPES: BadgeTriggerType[] = [
  'CHECKLIST_COMPLETE',
  'FIRST_TODO_LIST',
  'FIRST_SHORTCUT',
  'FIRST_TIMER',
  'FIRST_NOTE',
  'FIRST_STICKER',
  'FIRST_STUDY_SESSION',
];

@Component({
  selector: 'app-badge-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './badge-manager.component.html',
  styleUrl: './badge-manager.component.scss',
})
export class BadgeManagerComponent implements OnInit {
  protected badges = signal<Badge[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected editingBadge = signal<Badge | null>(null);
  protected showForm = signal(false);

  protected form: SaveBadgeRequest = {
    name: '',
    description: null,
    emoji: null,
    iconUrl: null,
    triggerType: 'FIRST_NOTE',
    triggerParam: null,
  };

  protected readonly triggerTypes = TRIGGER_TYPES;
  protected readonly triggerLabels = TRIGGER_LABELS;

  // Content card search for CHECKLIST_COMPLETE
  protected cardSearch = '';
  protected cardResults = signal<ContentCardAdmin[]>([]);
  protected selectedCard = signal<ContentCardAdmin | null>(null);

  constructor(
    private api: BadgeApiService,
    private contentApi: ContentApiService,
  ) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.adminListBadges().subscribe({
      next: (badges) => {
        this.badges.set(badges);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load badges');
        this.loading.set(false);
      },
    });
  }

  protected triggerLabel(type: BadgeTriggerType): string {
    return TRIGGER_LABELS[type];
  }

  protected openNew() {
    this.editingBadge.set(null);
    this.form = {
      name: '',
      description: null,
      emoji: null,
      iconUrl: null,
      triggerType: 'FIRST_NOTE',
      triggerParam: null,
    };
    this.cardSearch = '';
    this.cardResults.set([]);
    this.selectedCard.set(null);
    this.showForm.set(true);
  }

  protected openEdit(badge: Badge) {
    this.editingBadge.set(badge);
    this.form = {
      name: badge.name,
      description: badge.description,
      emoji: badge.emoji,
      iconUrl: badge.iconUrl,
      triggerType: badge.triggerType,
      triggerParam: badge.triggerParam,
    };
    this.cardSearch = '';
    this.cardResults.set([]);
    this.selectedCard.set(null);
    this.showForm.set(true);
  }

  protected get needsContentCard(): boolean {
    return this.form.triggerType === 'CHECKLIST_COMPLETE';
  }

  protected onTriggerTypeChange() {
    if (!this.needsContentCard) {
      this.form.triggerParam = null;
      this.cardSearch = '';
      this.selectedCard.set(null);
    }
  }

  protected searchCards() {
    if (!this.cardSearch.trim()) {
      this.cardResults.set([]);
      return;
    }
    this.contentApi.adminListCards().subscribe({
      next: (cards) => {
        const q = this.cardSearch.toLowerCase();
        this.cardResults.set(
          cards
            .filter((c) => c.title.toLowerCase().includes(q))
            .slice(0, 10),
        );
      },
    });
  }

  protected selectCard(card: ContentCardAdmin) {
    this.selectedCard.set(card);
    this.form.triggerParam = String(card.id);
    this.cardSearch = card.title;
    this.cardResults.set([]);
  }

  protected save() {
    const payload: SaveBadgeRequest = { ...this.form };
    const editing = this.editingBadge();
    const obs = editing
      ? this.api.adminUpdateBadge(editing.id, payload)
      : this.api.adminCreateBadge(payload);

    obs.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.detail ?? 'Save failed'),
    });
  }

  protected delete(badge: Badge) {
    if (
      !confirm(
        `Delete badge "${badge.name}"? Users who earned this badge will lose it.`,
      )
    )
      return;
    this.api.adminDeleteBadge(badge.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.detail ?? 'Delete failed'),
    });
  }

  protected cancel() {
    this.showForm.set(false);
    this.error.set(null);
  }
}
