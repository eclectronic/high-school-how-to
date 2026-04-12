import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { LockerLayoutItem } from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class LockerLayoutApiService implements OnDestroy {
  private readonly http = inject(HttpClient);

  private readonly debouncedSave$ = new Subject<LockerLayoutItem[]>();
  private readonly debounceSub: Subscription;

  constructor() {
    this.debounceSub = this.debouncedSave$
      .pipe(
        debounceTime(400),
        switchMap((items) => this.http.post<LockerLayoutItem[]>('/api/locker/layout', { items })),
      )
      .subscribe({ error: () => {} });
  }

  ngOnDestroy(): void {
    this.debounceSub.unsubscribe();
  }

  getLayout(): Observable<LockerLayoutItem[]> {
    return this.http.get<LockerLayoutItem[]>('/api/locker/layout');
  }

  /** Fire-and-forget save: immediately sends to the API. Use on drag-end/delete. */
  saveLayout(items: LockerLayoutItem[]): Observable<LockerLayoutItem[]> {
    return this.http.post<LockerLayoutItem[]>('/api/locker/layout', { items });
  }

  /** Debounced save (400 ms): coalesces rapid calls during drag/resize. */
  saveLayoutDebounced(items: LockerLayoutItem[]): void {
    this.debouncedSave$.next(items);
  }
}
