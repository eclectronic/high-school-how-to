import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LockerTextSize = 'SMALL' | 'DEFAULT' | 'LARGE' | 'XLARGE';

export interface AppPreferences {
  activeApps: string[]; // subset of ['TODO','NOTES','TIMER','SHORTCUTS']
  paneOrder: string[] | null;
  paletteName: string;
  lockerColor: string | null; // hex color e.g. '#f5ede0', null = use default
  fontFamily: string | null;  // null = system default; 'serif' | 'mono' | 'rounded'
  lockerTextSize: LockerTextSize;
  appColors: Record<string, string> | null;
}

@Injectable({ providedIn: 'root' })
export class AppPreferencesApiService {
  private readonly http = inject(HttpClient);

  getPreferences(): Observable<AppPreferences> {
    return this.http.get<AppPreferences>('/api/locker/app-preferences');
  }

  updatePreferences(req: Partial<AppPreferences>): Observable<AppPreferences> {
    return this.http.put<AppPreferences>('/api/locker/app-preferences', req);
  }
}
