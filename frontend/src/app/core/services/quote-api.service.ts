import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Quote } from '../models/task.models';

export interface SaveQuoteRequest {
  quoteText: string;
  attribution?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class QuoteApiService {
  private readonly http = inject(HttpClient);

  getTodayQuote(): Observable<Quote> {
    return this.http.get<Quote>('/api/quotes/today');
  }

  adminListQuotes(): Observable<Quote[]> {
    return this.http.get<Quote[]>('/api/admin/quotes');
  }

  adminCreateQuote(request: SaveQuoteRequest): Observable<Quote> {
    return this.http.post<Quote>('/api/admin/quotes', request);
  }

  adminUpdateQuote(id: number, request: SaveQuoteRequest): Observable<Quote> {
    return this.http.put<Quote>(`/api/admin/quotes/${id}`, request);
  }

  adminDeleteQuote(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/quotes/${id}`);
  }
}
