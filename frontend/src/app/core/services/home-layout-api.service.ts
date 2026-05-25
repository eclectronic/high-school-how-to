import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HomeSection, HomeSectionRequest } from '../models/home-layout.models';

@Injectable({ providedIn: 'root' })
export class HomeLayoutApiService {
  private readonly http = inject(HttpClient);
  readonly sections = signal<HomeSection[]>([]);

  loadSections(): void {
    this.http.get<HomeSection[]>('/api/home-layout').subscribe({
      next: (s) => this.sections.set(s),
      error: () => {},
    });
  }

  adminList() {
    return this.http.get<HomeSection[]>('/api/admin/home-layout');
  }

  adminSave(sections: HomeSectionRequest[]) {
    return this.http.put<HomeSection[]>('/api/admin/home-layout', sections);
  }
}
