package com.highschoolhowto.quote;

import com.highschoolhowto.quote.dto.QuoteResponse;
import com.highschoolhowto.quote.dto.SaveQuoteRequest;
import com.highschoolhowto.web.ApiException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuoteService {

    private final QuoteRepository quoteRepository;

    public QuoteService(QuoteRepository quoteRepository) {
        this.quoteRepository = quoteRepository;
    }

    @Transactional(readOnly = true)
    public QuoteResponse getQuoteOfTheDay() {
        List<Quote> quotes = quoteRepository.findAllByOrderByIdAsc();
        if (quotes.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No quotes", "No quotes are available");
        }
        long index = LocalDate.now().toEpochDay() % quotes.size();
        return toResponse(quotes.get((int) index));
    }

    @Transactional(readOnly = true)
    public List<QuoteResponse> listQuotes() {
        return quoteRepository.findAllByOrderByIdAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public QuoteResponse createQuote(SaveQuoteRequest request) {
        Quote quote = new Quote();
        quote.setQuoteText(request.quoteText().trim());
        quote.setAttribution(request.attribution() != null ? request.attribution().trim() : null);
        return toResponse(quoteRepository.save(quote));
    }

    @Transactional
    public QuoteResponse updateQuote(Long id, SaveQuoteRequest request) {
        Quote quote = requireQuote(id);
        quote.setQuoteText(request.quoteText().trim());
        quote.setAttribution(request.attribution() != null ? request.attribution().trim() : null);
        return toResponse(quoteRepository.save(quote));
    }

    @Transactional
    public void deleteQuote(Long id) {
        Quote quote = requireQuote(id);
        quoteRepository.delete(quote);
    }

    private Quote requireQuote(Long id) {
        return quoteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quote not found", "Quote not found"));
    }

    private QuoteResponse toResponse(Quote quote) {
        return new QuoteResponse(quote.getId(), quote.getQuoteText(), quote.getAttribution());
    }
}
