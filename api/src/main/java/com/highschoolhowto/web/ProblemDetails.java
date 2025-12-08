package com.highschoolhowto.web;

import java.util.List;

public record ProblemDetails(
        String type, String title, int status, String detail, String traceId, List<Violation> violations) {

    public record Violation(String field, String message) {}
}
