package com.highschoolhowto.content.tag;

public record TagResponse(Long id, String slug, String name, String description, int sortOrder) {

    public static TagResponse from(Tag tag) {
        return new TagResponse(tag.getId(), tag.getSlug(), tag.getName(), tag.getDescription(), tag.getSortOrder());
    }
}
