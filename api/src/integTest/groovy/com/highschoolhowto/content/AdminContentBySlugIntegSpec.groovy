package com.highschoolhowto.content

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.content.card.CardStatus
import com.highschoolhowto.content.card.CardType
import com.highschoolhowto.content.card.ContentCard
import com.highschoolhowto.content.card.ContentCardRepository
import com.highschoolhowto.content.tag.Tag
import com.highschoolhowto.content.tag.TagRepository
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.User
import com.highschoolhowto.user.UserRepository
import com.highschoolhowto.user.UserRole
import com.highschoolhowto.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Integration tests for GET /api/admin/content/by-slug/{slug}.
 *
 * Verifies that DRAFT cards are accessible to admins via the admin endpoint,
 * while the public endpoint returns 404 for the same draft card.
 */
class AdminContentBySlugIntegSpec extends BaseIntegrationSpec {

    @Autowired ContentCardRepository cardRepository
    @Autowired TagRepository tagRepository
    @Autowired UserRepository userRepository
    @Autowired JwtService jwtService

    private final String prefix = "by-slug-test-${UUID.randomUUID()}-"

    private User createAdminUser(String email) {
        def user = new User()
        user.email = email
        user.firstName = "Admin"
        user.lastName = "User"
        user.passwordHash = "irrelevant"
        user.status = UserStatus.ACTIVE
        user.role = UserRole.ADMIN
        return userRepository.save(user)
    }

    private User createRegularUser(String email) {
        def user = new User()
        user.email = email
        user.firstName = "Regular"
        user.lastName = "User"
        user.passwordHash = "irrelevant"
        user.status = UserStatus.ACTIVE
        user.role = UserRole.USER
        return userRepository.save(user)
    }

    private Tag makeTag(String slugSuffix) {
        Tag t = new Tag()
        t.slug = prefix + slugSuffix
        t.name = slugSuffix
        tagRepository.save(t)
    }

    private ContentCard makeCard(String slug, CardStatus status) {
        Tag tag = makeTag("tag-${slug}")
        ContentCard card = new ContentCard()
        card.slug = slug
        card.title = "Title for ${slug}"
        card.cardType = CardType.ARTICLE
        card.status = status
        card.tags = [tag]
        cardRepository.save(card)
    }

    def "GET /api/admin/content/by-slug/{slug} returns 200 with DRAFT card for admin"() {
        given:
        def admin = createAdminUser("by-slug-admin-draft@example.com")
        def token = jwtService.generateAccessToken(admin)
        def slug = prefix + "draft-card"
        makeCard(slug, CardStatus.DRAFT)

        when:
        def result = getWithAuth("/api/admin/content/by-slug/${slug}", token)

        then:
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.slug').value(slug))
              .andExpect(jsonPath('$.status').value('DRAFT'))
    }

    def "GET /api/admin/content/by-slug/{slug} returns 200 with PUBLISHED card for admin"() {
        given:
        def admin = createAdminUser("by-slug-admin-pub@example.com")
        def token = jwtService.generateAccessToken(admin)
        def slug = prefix + "pub-card"
        makeCard(slug, CardStatus.PUBLISHED)

        when:
        def result = getWithAuth("/api/admin/content/by-slug/${slug}", token)

        then:
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.slug').value(slug))
              .andExpect(jsonPath('$.status').value('PUBLISHED'))
    }

    def "GET /api/content/cards/{slug} returns 404 for a DRAFT card (public endpoint)"() {
        given:
        def slug = prefix + "draft-public"
        makeCard(slug, CardStatus.DRAFT)

        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/content/cards/${slug}"))

        then:
        result.andExpect(status().isNotFound())
    }

    def "GET /api/admin/content/by-slug/{slug} returns 403 for a regular user"() {
        given:
        def user = createRegularUser("by-slug-user@example.com")
        def token = jwtService.generateAccessToken(user)
        def slug = prefix + "card-user"
        makeCard(slug, CardStatus.DRAFT)

        when:
        def result = getWithAuth("/api/admin/content/by-slug/${slug}", token)

        then:
        result.andExpect(status().isForbidden())
    }

    def "GET /api/admin/content/by-slug/{slug} returns 401 without auth"() {
        given:
        def slug = prefix + "noauth"
        makeCard(slug, CardStatus.DRAFT)

        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/content/by-slug/${slug}"))

        then:
        result.andExpect(status().isUnauthorized())
    }

    def "GET /api/admin/content/by-slug/{slug} returns 404 for non-existent slug"() {
        given:
        def admin = createAdminUser("by-slug-admin-404@example.com")
        def token = jwtService.generateAccessToken(admin)

        when:
        def result = getWithAuth("/api/admin/content/by-slug/this-slug-does-not-exist", token)

        then:
        result.andExpect(status().isNotFound())
    }
}
