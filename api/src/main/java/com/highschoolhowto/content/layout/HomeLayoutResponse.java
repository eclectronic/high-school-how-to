package com.highschoolhowto.content.layout;

import com.highschoolhowto.content.card.ContentCardResponse;
import com.highschoolhowto.content.tag.TagResponse;
import java.util.List;

public record HomeLayoutResponse(List<SectionResponse> sections) {

    public record SectionResponse(
            TagResponse tag,
            String heading,
            List<ContentCardResponse> cards) {}
}
