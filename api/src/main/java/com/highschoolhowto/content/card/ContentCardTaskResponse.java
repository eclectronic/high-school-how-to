package com.highschoolhowto.content.card;

public record ContentCardTaskResponse(Long id, String description, int sortOrder) {

    public static ContentCardTaskResponse from(ContentCardTask task) {
        return new ContentCardTaskResponse(task.getId(), task.getDescription(), task.getSortOrder());
    }
}
