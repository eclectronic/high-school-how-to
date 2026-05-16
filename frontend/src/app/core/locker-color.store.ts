import { Injectable, signal } from '@angular/core';

const DEFAULT = '#f5ede0';
const KEY = 'hsht.lockerColor';

@Injectable({ providedIn: 'root' })
export class LockerColorStore {
  readonly color = signal<string>(this.load());

  set(color: string | null): void {
    const resolved = color ?? DEFAULT;
    this.color.set(resolved);
    try { localStorage.setItem(KEY, resolved); } catch { /* ignore */ }
  }

  private load(): string {
    try { return localStorage.getItem(KEY) ?? DEFAULT; } catch { return DEFAULT; }
  }
}
