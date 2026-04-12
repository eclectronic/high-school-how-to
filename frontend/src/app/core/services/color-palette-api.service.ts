import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { DEFAULT_PALETTE } from '../../shared/color-picker/color-utils';

@Injectable({ providedIn: 'root' })
export class ColorPaletteApiService {
  private readonly http = inject(HttpClient);

  /**
   * Shared, cached observable — the palette rarely changes so we replay the
   * last emitted value to all subscribers.  Cache is per service lifetime
   * (app-wide singleton via providedIn: 'root').
   */
  private readonly palette$ = this.http.get<string[]>('/api/color-palette').pipe(
    shareReplay(1),
  );

  /** Returns the admin-configured palette.  Falls back to DEFAULT_PALETTE on error. */
  getPalette(): Observable<string[]> {
    return this.palette$;
  }

  /** Replaces the entire palette.  Admin-only. */
  adminReplacePalette(colors: string[]): Observable<string[]> {
    return this.http.put<string[]>('/api/admin/color-palette', colors);
  }

  /** Synchronous fallback used before the API responds. */
  getDefaultPalette(): string[] {
    return DEFAULT_PALETTE;
  }
}
