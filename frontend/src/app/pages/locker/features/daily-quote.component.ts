import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteApiService } from '../../../core/services/quote-api.service';
import { Quote } from '../../../core/models/task.models';

@Component({
  selector: 'app-daily-quote',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-quote.component.html',
  styleUrl: './daily-quote.component.scss',
})
export class DailyQuoteComponent implements OnInit {
  private readonly quoteApi = inject(QuoteApiService);

  protected quote = signal<Quote | null>(null);
  protected loading = signal(true);

  ngOnInit(): void {
    this.quoteApi.getTodayQuote().subscribe({
      next: q => {
        this.quote.set(q);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
