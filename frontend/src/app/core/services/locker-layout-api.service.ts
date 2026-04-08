import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LockerLayoutItem } from '../models/task.models';

@Injectable({
  providedIn: 'root',
})
export class LockerLayoutApiService {
  private readonly http = inject(HttpClient);

  getLayout(): Observable<LockerLayoutItem[]> {
    return this.http.get<LockerLayoutItem[]>('/api/locker/layout');
  }

  saveLayout(items: LockerLayoutItem[]): Observable<LockerLayoutItem[]> {
    return this.http.post<LockerLayoutItem[]>('/api/locker/layout', { items });
  }
}
