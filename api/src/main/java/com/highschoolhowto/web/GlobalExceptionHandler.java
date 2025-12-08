package com.highschoolhowto.web;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetails> handleApiException(ApiException ex) {
        return buildResponse(ex.getStatus(), ex.getTitle(), ex.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetails> handleValidation(MethodArgumentNotValidException ex) {
        List<ProblemDetails.Violation> violations = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new ProblemDetails.Violation(error.getField(), error.getDefaultMessage()))
                .collect(Collectors.toList());
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation failed", "Request validation failed", violations);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ProblemDetails> handleConstraint(ConstraintViolationException ex) {
        List<ProblemDetails.Violation> violations = ex.getConstraintViolations().stream()
                .map(this::toViolation)
                .collect(Collectors.toList());
        return buildResponse(HttpStatus.BAD_REQUEST, "Validation failed", "Request validation failed", violations);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetails> handleUnhandled(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", ex.getMessage(), List.of());
    }

    private ProblemDetails.Violation toViolation(ConstraintViolation<?> violation) {
        return new ProblemDetails.Violation(violation.getPropertyPath().toString(), violation.getMessage());
    }

    private ResponseEntity<ProblemDetails> buildResponse(
            HttpStatus status, String title, String detail, List<ProblemDetails.Violation> violations) {
        ProblemDetails problem = new ProblemDetails(
                "about:blank",
                title,
                status.value(),
                detail,
                UUID.randomUUID().toString(),
                violations);
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(problem);
    }
}
