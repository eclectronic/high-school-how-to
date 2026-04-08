package com.highschoolhowto.quote;

import com.highschoolhowto.quote.dto.QuoteResponse;
import com.highschoolhowto.quote.dto.SaveQuoteRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @GetMapping("/api/quotes/today")
    public ResponseEntity<QuoteResponse> today() {
        return ResponseEntity.ok(quoteService.getQuoteOfTheDay());
    }

    @GetMapping("/api/admin/quotes")
    public ResponseEntity<List<QuoteResponse>> list() {
        return ResponseEntity.ok(quoteService.listQuotes());
    }

    @PostMapping("/api/admin/quotes")
    public ResponseEntity<QuoteResponse> create(@Valid @RequestBody SaveQuoteRequest request) {
        return ResponseEntity.ok(quoteService.createQuote(request));
    }

    @PutMapping("/api/admin/quotes/{id}")
    public ResponseEntity<QuoteResponse> update(
            @PathVariable("id") Long id,
            @Valid @RequestBody SaveQuoteRequest request) {
        return ResponseEntity.ok(quoteService.updateQuote(id, request));
    }

    @DeleteMapping("/api/admin/quotes/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        quoteService.deleteQuote(id);
        return ResponseEntity.noContent().build();
    }
}
