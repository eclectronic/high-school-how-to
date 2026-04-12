package com.highschoolhowto.quote;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.highschoolhowto.quote.dto.QuoteResponse;
import com.highschoolhowto.quote.dto.SaveQuoteRequest;
import com.highschoolhowto.web.ApiException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class QuoteServiceTest {

    @Mock
    QuoteRepository quoteRepository;

    @InjectMocks
    QuoteService quoteService;

    private Quote makeQuote(Long id, String text, String attribution) {
        Quote q = new Quote();
        try {
            var field = Quote.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(q, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        q.setQuoteText(text);
        q.setAttribution(attribution);
        return q;
    }

    @Test
    void getQuoteOfTheDay_returnsDeterministicQuote() {
        Quote q1 = makeQuote(1L, "Quote One", "Author One");
        Quote q2 = makeQuote(2L, "Quote Two", "Author Two");
        Quote q3 = makeQuote(3L, "Quote Three", "Author Three");
        when(quoteRepository.findAllByOrderByIdAsc()).thenReturn(List.of(q1, q2, q3));

        QuoteResponse r1 = quoteService.getQuoteOfTheDay();
        QuoteResponse r2 = quoteService.getQuoteOfTheDay();

        // Same call on same date always returns the same quote
        assertThat(r1.quoteText()).isEqualTo(r2.quoteText());
    }

    @Test
    void getQuoteOfTheDay_usesDateModuloIndex() {
        Quote q1 = makeQuote(1L, "Quote One", null);
        Quote q2 = makeQuote(2L, "Quote Two", null);
        when(quoteRepository.findAllByOrderByIdAsc()).thenReturn(List.of(q1, q2));

        int index = Math.min(LocalDate.now().getDayOfYear() - 1, 1);
        QuoteResponse response = quoteService.getQuoteOfTheDay();

        String expected = index == 0 ? "Quote One" : "Quote Two";
        assertThat(response.quoteText()).isEqualTo(expected);
    }

    @Test
    void getQuoteOfTheDay_throws404WhenEmpty() {
        when(quoteRepository.findAllByOrderByIdAsc()).thenReturn(List.of());

        assertThatThrownBy(() -> quoteService.getQuoteOfTheDay())
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void createQuote_savesAndReturnsResponse() {
        Quote saved = makeQuote(1L, "Hello World", "Someone");
        when(quoteRepository.save(any(Quote.class))).thenReturn(saved);

        QuoteResponse response = quoteService.createQuote(new SaveQuoteRequest("Hello World", "Someone"));

        assertThat(response.quoteText()).isEqualTo("Hello World");
        assertThat(response.attribution()).isEqualTo("Someone");
        verify(quoteRepository).save(any(Quote.class));
    }

    @Test
    void updateQuote_throws404WhenNotFound() {
        when(quoteRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> quoteService.updateQuote(99L, new SaveQuoteRequest("text", null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(quoteRepository, never()).save(any());
    }

    @Test
    void deleteQuote_throws404WhenNotFound() {
        when(quoteRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> quoteService.deleteQuote(99L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
