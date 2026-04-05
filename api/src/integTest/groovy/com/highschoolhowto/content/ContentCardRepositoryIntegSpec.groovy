package com.highschoolhowto.content

import com.highschoolhowto.content.card.CardStatus
import com.highschoolhowto.content.card.CardType
import com.highschoolhowto.content.card.ContentCard
import com.highschoolhowto.content.card.ContentCardRepository
import com.highschoolhowto.content.tag.Tag
import com.highschoolhowto.content.tag.TagRepository
import com.highschoolhowto.support.BaseIntegrationSpec
import jakarta.persistence.EntityManager
import org.springframework.beans.factory.annotation.Autowired

/**
 * Integration tests for ContentCardRepository query correctness.
 *
 * Regression coverage for the Hibernate first-level cache / JOIN FETCH collection
 * pollution bug: when findByTagSlugAndStatus is called multiple times in the same
 * transaction (as PageLayoutService.getHomeLayout does for each section), each result
 * must carry the card's full tag collection — not just the tag used as the filter.
 */
class ContentCardRepositoryIntegSpec extends BaseIntegrationSpec {

    @Autowired ContentCardRepository cardRepository
    @Autowired TagRepository tagRepository
    @Autowired EntityManager entityManager

    // ── helpers ─────────────────────────────────────────────────────────────

    // Use a unique prefix per test to avoid conflicts with Liquibase seed data.
    private final String prefix = "test-${UUID.randomUUID()}-"

    private Tag makeTag(String slugSuffix, String name) {
        Tag t = new Tag()
        t.slug = prefix + slugSuffix
        t.name = name
        tagRepository.save(t)
    }

    private ContentCard makeCard(String slugSuffix, CardStatus status, List<Tag> tags) {
        ContentCard c = new ContentCard()
        c.slug     = prefix + slugSuffix
        c.title    = slugSuffix
        c.cardType = CardType.ARTICLE
        c.status   = status
        c.tags     = tags
        cardRepository.save(c)
    }

    // ── findByTagSlugAndStatus ───────────────────────────────────────────────

    def "findByTagSlugAndStatus returns cards with their full tag collection, not just the filter tag"() {
        given: "two tags and a card that belongs to both"
        Tag tagA = makeTag("tag-a", "Tag A")
        Tag tagB = makeTag("tag-b", "Tag B")

        ContentCard both = makeCard("card-both", CardStatus.PUBLISHED, [tagA, tagB])
        makeCard("card-a-only", CardStatus.PUBLISHED, [tagA])
        makeCard("card-b-only", CardStatus.PUBLISHED, [tagB])

        entityManager.flush()
        entityManager.clear()   // evict L1 cache so queries start fresh

        when: "section A is loaded first (mirrors getHomeLayout iterating over sections)"
        def sectionA = cardRepository.findByTagSlugAndStatus(tagA.slug, CardStatus.PUBLISHED)

        and: "section B is loaded second — within the same transaction"
        def sectionB = cardRepository.findByTagSlugAndStatus(tagB.slug, CardStatus.PUBLISHED)

        then: "the shared card in section B carries BOTH tags (not just tag-b)"
        def bothInB = sectionB.find { it.slug == both.slug }
        bothInB != null
        bothInB.tags.size() == 2
        bothInB.tags*.slug.toSet() == [tagA.slug, tagB.slug].toSet()

        and: "the same card in section A also carries both tags"
        def bothInA = sectionA.find { it.slug == both.slug }
        bothInA.tags.size() == 2
        bothInA.tags*.slug.toSet() == [tagA.slug, tagB.slug].toSet()
    }

    def "findByTagSlugAndStatus excludes DRAFT cards"() {
        given:
        Tag tag = makeTag("tag", "Tag")
        makeCard("published", CardStatus.PUBLISHED, [tag])
        makeCard("draft",     CardStatus.DRAFT,     [tag])

        entityManager.flush()
        entityManager.clear()

        when:
        def cards = cardRepository.findByTagSlugAndStatus(tag.slug, CardStatus.PUBLISHED)

        then:
        cards*.slug == [prefix + "published"]
    }

    def "findByTagSlugAndStatus returns empty list when no published cards have the given tag"() {
        given:
        Tag emptyTag = makeTag("empty", "Empty")
        Tag otherTag = makeTag("other", "Other")
        makeCard("other-card", CardStatus.PUBLISHED, [otherTag])

        entityManager.flush()
        entityManager.clear()

        when:
        def cards = cardRepository.findByTagSlugAndStatus(emptyTag.slug, CardStatus.PUBLISHED)

        then:
        cards.isEmpty()
    }

    // ── findTagsWithCardStatus ───────────────────────────────────────────────

    def "TagRepository findTagsWithCardStatus includes tags with published cards and excludes draft-only and empty tags"() {
        given: "one tag with a published card, one with only a draft, one with no cards"
        Tag withPublished = makeTag("with-published", "With Published")
        Tag draftOnly     = makeTag("draft-only",     "Draft Only")
        Tag empty         = makeTag("empty",          "Empty")

        makeCard("pub",   CardStatus.PUBLISHED, [withPublished])
        makeCard("draft", CardStatus.DRAFT,     [draftOnly])

        entityManager.flush()
        entityManager.clear()

        when:
        def slugs = tagRepository.findTagsWithCardStatus(CardStatus.PUBLISHED)*.slug.toSet()

        then: "tag with a published card is included"
        slugs.contains(withPublished.slug)

        and: "tag with only a draft card is excluded"
        !slugs.contains(draftOnly.slug)

        and: "tag with no cards at all is excluded"
        !slugs.contains(empty.slug)
    }
}
