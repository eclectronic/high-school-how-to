package com.highschoolhowto.content.card;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/content")
@PreAuthorize("hasRole('ADMIN')")
public class AdminContentCardController {

    private final ContentCardService cardService;

    public AdminContentCardController(ContentCardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping
    public List<ContentCardAdminResponse> listAll() {
        return cardService.findAll().stream().map(ContentCardAdminResponse::from).toList();
    }

    @GetMapping("/search")
    public List<ContentCardSummary> search(
            @RequestParam String q, @RequestParam(required = false) Long exclude) {
        return cardService.searchCards(q, exclude);
    }

    @GetMapping("/{id}")
    public ContentCardAdminResponse getById(@PathVariable Long id) {
        return ContentCardAdminResponse.from(cardService.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContentCardAdminResponse create(@Valid @RequestBody SaveCardRequest request) {
        return ContentCardAdminResponse.from(cardService.create(request));
    }

    @PutMapping("/{id}")
    public ContentCardAdminResponse update(@PathVariable Long id, @Valid @RequestBody SaveCardRequest request) {
        return ContentCardAdminResponse.from(cardService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        cardService.delete(id);
    }
}
