package com.highschoolhowto.content

import com.highschoolhowto.content.card.CardStatus
import com.highschoolhowto.content.card.CardType
import com.highschoolhowto.content.card.ContentCard
import com.highschoolhowto.content.card.ContentCardRepository
import com.highschoolhowto.content.card.ContentCardTask
import com.highschoolhowto.content.tag.Tag
import com.highschoolhowto.content.tag.TagRepository
import com.highschoolhowto.support.BaseIntegrationSpec
import jakarta.persistence.EntityManager
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Integration tests for GET /api/content/cards/{slug}.
 *
 * Regression coverage for the Hibernate MultipleBagFetchException that was thrown
 * when a ContentCard had both a tags collection and a templateTasks collection and
 * both were JOIN FETCHed in the same JPQL query. The fix removes templateTasks from
 * the JOIN FETCH and loads it via @Fetch(FetchMode.SUBSELECT) instead.
 */
class ContentCardControllerIntegSpec extends BaseIntegrationSpec {

    @Autowired ContentCardRepository cardRepository
    @Autowired TagRepository tagRepository
    @Autowired EntityManager entityManager

    private final String prefix = "test-${UUID.randomUUID()}-"

    private Tag makeTag(String slugSuffix, String name) {
        Tag t = new Tag()
        t.slug = prefix + slugSuffix
        t.name = name
        tagRepository.save(t)
    }

    private ContentCard makeCard(String slugSuffix, CardType type, CardStatus status, List<Tag> tags, List<String> taskDescriptions = []) {
        ContentCard c = new ContentCard()
        c.slug     = prefix + slugSuffix
        c.title    = slugSuffix
        c.cardType = type
        c.status   = status
        c.tags     = tags
        taskDescriptions.eachWithIndex { desc, i ->
            ContentCardTask task = new ContentCardTask()
            task.card = c
            task.description = desc
            task.sortOrder = i
            c.templateTasks.add(task)
        }
        cardRepository.save(c)
    }

    // ── GET /api/content/cards/{slug} ──────────────────────────────────────────

    def "GET /api/content/cards/{slug} returns 200 for a published card with tags and template tasks"() {
        given: "a published TODO_LIST card with one tag and two template tasks"
        Tag tag = makeTag("tag", "Test Tag")
        ContentCard card = makeCard("todo-card", CardType.TODO_LIST, CardStatus.PUBLISHED, [tag], ["Step one", "Step two"])

        entityManager.flush()
        entityManager.clear()

        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/content/cards/${card.slug}"))

        then: "the response is 200 with the card data — no MultipleBagFetchException"
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.slug').value(card.slug))
              .andExpect(jsonPath('$.cardType').value('TODO_LIST'))
              .andExpect(jsonPath('$.tags.length()').value(1))
              .andExpect(jsonPath('$.templateTasks.length()').value(2))
              .andExpect(jsonPath('$.templateTasks[0].description').value("Step one"))
              .andExpect(jsonPath('$.templateTasks[1].description').value("Step two"))
    }

    def "GET /api/content/cards/{slug} returns 200 for a published card with tags but no template tasks"() {
        given: "a published VIDEO card (no template tasks)"
        Tag tag = makeTag("tag", "Test Tag")
        ContentCard card = makeCard("video-card", CardType.VIDEO, CardStatus.PUBLISHED, [tag])
        card.mediaUrl = "https://www.youtube.com/watch?v=abc123"
        cardRepository.save(card)

        entityManager.flush()
        entityManager.clear()

        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/content/cards/${card.slug}"))

        then:
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.slug').value(card.slug))
              .andExpect(jsonPath('$.cardType').value('VIDEO'))
              .andExpect(jsonPath('$.templateTasks.length()').value(0))
    }

    def "GET /api/content/cards/{slug} returns 404 for a draft card"() {
        given: "a draft card"
        Tag tag = makeTag("tag", "Test Tag")
        ContentCard card = makeCard("draft-card", CardType.ARTICLE, CardStatus.DRAFT, [tag])

        entityManager.flush()
        entityManager.clear()

        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/content/cards/${card.slug}"))

        then:
        result.andExpect(status().isNotFound())
    }

    def "GET /api/content/cards/{slug} returns 404 for an unknown slug"() {
        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/content/cards/no-such-slug"))

        then:
        result.andExpect(status().isNotFound())
    }

    // ── GET /api/tags/{slug}/cards ─────────────────────────────────────────────

    def "GET /api/tags/{slug}/cards returns ContentCardResponse objects, not raw ContentCard entities"() {
        given: "a published card under a tag"
        Tag tag = makeTag("tag", "Test Tag")
        ContentCard card = makeCard("tagged-card", CardType.ARTICLE, CardStatus.PUBLISHED, [tag])

        entityManager.flush()
        entityManager.clear()

        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/tags/${tag.slug}/cards"))

        then: "response is a JSON array with the card's slug — not a 500 from type mismatch"
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$[0].slug').value(card.slug))
              .andExpect(jsonPath('$[0].tags').isArray())
    }
}
