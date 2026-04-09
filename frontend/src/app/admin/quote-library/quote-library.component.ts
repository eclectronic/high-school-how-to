import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Quote } from '../../core/models/task.models';
import { QuoteApiService, SaveQuoteRequest } from '../../core/services/quote-api.service';

@Component({
  selector: 'app-quote-library',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quote-library.component.html',
  styleUrl: './quote-library.component.scss',
})
export class QuoteLibraryComponent implements OnInit {
  protected quotes = signal<Quote[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected editingQuote = signal<Quote | null>(null);
  protected showForm = signal(false);

  protected form: SaveQuoteRequest = { quoteText: '', attribution: null };

  constructor(private readonly api: QuoteApiService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.adminListQuotes().subscribe({
      next: (quotes) => {
        this.quotes.set(quotes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load quotes');
        this.loading.set(false);
      },
    });
  }

  protected openNew() {
    this.editingQuote.set(null);
    this.form = { quoteText: '', attribution: null };
    this.showForm.set(true);
  }

  protected openEdit(quote: Quote) {
    this.editingQuote.set(quote);
    this.form = { quoteText: quote.quoteText, attribution: quote.attribution ?? null };
    this.showForm.set(true);
  }

  protected save() {
    const editing = this.editingQuote();
    const obs = editing
      ? this.api.adminUpdateQuote(editing.id, this.form)
      : this.api.adminCreateQuote(this.form);

    obs.subscribe({
      next: (saved) => {
        this.showForm.set(false);
        if (editing) {
          this.quotes.update((qs) => qs.map((q) => (q.id === saved.id ? saved : q)));
        } else {
          this.quotes.update((qs) => [...qs, saved]);
        }
      },
      error: (err) => this.error.set(err?.error?.detail ?? 'Save failed'),
    });
  }

  protected delete(quote: Quote) {
    if (!confirm(`Delete this quote? This cannot be undone.`)) return;
    this.api.adminDeleteQuote(quote.id).subscribe({
      next: () => this.quotes.update((qs) => qs.filter((q) => q.id !== quote.id)),
      error: (err) => this.error.set(err?.error?.detail ?? 'Delete failed'),
    });
  }

  protected cancel() {
    this.showForm.set(false);
    this.error.set(null);
  }
}
