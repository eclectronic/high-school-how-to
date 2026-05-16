import { Injectable, signal, computed } from '@angular/core';

export interface DirtyCard {
  id?: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class EditModeStore {
  private readonly _enabled = signal(false);
  private readonly _dirtyCard = signal<DirtyCard | null>(null);
  private readonly _lastError = signal<string | null>(null);
  private readonly _pendingSave = signal(0);

  readonly enabled = this._enabled.asReadonly();
  readonly dirtyCard = this._dirtyCard.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly isDirty = computed(() => this._dirtyCard() !== null);
  readonly pendingSave = this._pendingSave.asReadonly();

  requestSave(): void {
    this._pendingSave.update(v => v + 1);
  }

  constructor() {
    // Hydrate from localStorage
    try {
      this._enabled.set(localStorage.getItem('hsht.editMode') === '1');
    } catch { /* SSR / private browsing */ }
  }

  toggle(): void {
    const next = !this._enabled();
    this._enabled.set(next);
    try {
      if (next) localStorage.setItem('hsht.editMode', '1');
      else localStorage.removeItem('hsht.editMode');
    } catch { /* ignore */ }
  }

  enable(): void {
    this._enabled.set(true);
    try { localStorage.setItem('hsht.editMode', '1'); } catch { /* ignore */ }
  }

  disable(): void {
    this._enabled.set(false);
    try { localStorage.removeItem('hsht.editMode'); } catch { /* ignore */ }
    this._dirtyCard.set(null);
  }

  markDirty(patch: DirtyCard): void {
    const current = this._dirtyCard() ?? {};
    this._dirtyCard.set({ ...current, ...patch });
  }

  discard(): void {
    this._dirtyCard.set(null);
    this._lastError.set(null);
  }

  commit(_savedCard: DirtyCard): void {
    this._dirtyCard.set(null);
    this._lastError.set(null);
  }

  setError(msg: string | null): void {
    this._lastError.set(msg);
  }

  clearOnLogout(): void {
    this.disable();
  }
}
