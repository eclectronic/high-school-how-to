package com.highschoolhowto.content

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.content.tag.Tag
import com.highschoolhowto.content.tag.TagRepository
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.User
import com.highschoolhowto.user.UserRepository
import com.highschoolhowto.user.UserRole
import com.highschoolhowto.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Integration tests for POST /api/admin/content skeleton creation.
 *
 * Verifies that:
 * - A card can be created with minimal fields (cardType + tagIds) and receives an auto-generated slug.
 * - The created card has status=DRAFT.
 * - Two cards with the same title receive distinct slugs (collision suffix logic).
 */
class AdminContentSkeletonCreateIntegSpec extends BaseIntegrationSpec {

    @Autowired TagRepository tagRepository
    @Autowired UserRepository userRepository
    @Autowired JwtService jwtService

    private final String prefix = "skeleton-${UUID.randomUUID()}-"

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

    private Tag makeTag(String suffix) {
        Tag t = new Tag()
        t.slug = prefix + suffix
        t.name = "Tag ${suffix}"
        tagRepository.save(t)
    }

    def "POST /api/admin/content with cardType and tagIds creates DRAFT with non-empty auto-slug"() {
        given:
        def admin = createAdminUser("skeleton-admin1@example.com")
        def token = jwtService.generateAccessToken(admin)
        def tag = makeTag("t1")

        def body = [
            cardType: 'ARTICLE',
            status: 'DRAFT',
            tagIds: [tag.id],
            simpleLayout: false,
            links: [],
            templateTasks: []
        ]

        when:
        def result = postJsonWithAuth("/api/admin/content", body, token)

        then:
        result.andExpect(status().isCreated())
              .andExpect(jsonPath('$.status').value('DRAFT'))
              .andExpect(jsonPath('$.slug').isNotEmpty())
    }

    def "POST /api/admin/content with title auto-generates slug from title"() {
        given:
        def admin = createAdminUser("skeleton-admin2@example.com")
        def token = jwtService.generateAccessToken(admin)
        def tag = makeTag("t2")

        def body = [
            title: "My Unique Article Title",
            cardType: 'ARTICLE',
            status: 'DRAFT',
            tagIds: [tag.id],
            simpleLayout: false,
            links: [],
            templateTasks: []
        ]

        when:
        def result = postJsonWithAuth("/api/admin/content", body, token)

        then:
        result.andExpect(status().isCreated())
              .andExpect(jsonPath('$.slug').value('my-unique-article-title'))
    }

    def "POST /api/admin/content twice with same title produces two distinct slugs"() {
        given:
        def admin = createAdminUser("skeleton-admin3@example.com")
        def token = jwtService.generateAccessToken(admin)
        def tag = makeTag("t3")

        def body = [
            title: "Duplicate Title Test",
            cardType: 'ARTICLE',
            status: 'DRAFT',
            tagIds: [tag.id],
            simpleLayout: false,
            links: [],
            templateTasks: []
        ]

        when:
        def result1 = postJsonWithAuth("/api/admin/content", body, token)
        def result2 = postJsonWithAuth("/api/admin/content", body, token)

        then:
        result1.andExpect(status().isCreated())
        result2.andExpect(status().isCreated())

        def response1 = objectMapper.readValue(result1.andReturn().response.contentAsString, Map)
        def response2 = objectMapper.readValue(result2.andReturn().response.contentAsString, Map)
        response1['slug'] != response2['slug']
        response1['slug'] != null
        response2['slug'] != null
    }

    def "POST /api/admin/content without title generates placeholder slug with cardType prefix"() {
        given:
        def admin = createAdminUser("skeleton-admin4@example.com")
        def token = jwtService.generateAccessToken(admin)
        def tag = makeTag("t4")

        def body = [
            cardType: 'VIDEO',
            status: 'DRAFT',
            tagIds: [tag.id],
            simpleLayout: false,
            links: [],
            templateTasks: []
        ]

        when:
        def result = postJsonWithAuth("/api/admin/content", body, token)

        then:
        result.andExpect(status().isCreated())
              .andExpect(jsonPath('$.slug').isNotEmpty())

        def response = objectMapper.readValue(result.andReturn().response.contentAsString, Map)
        (response['slug'] as String).startsWith('video-')
    }

    def "POST /api/admin/content returns 403 for regular user"() {
        given:
        def user = new User()
        user.email = "skeleton-user@example.com"
        user.firstName = "User"
        user.lastName = "User"
        user.passwordHash = "irrelevant"
        user.status = UserStatus.ACTIVE
        user.role = UserRole.USER
        userRepository.save(user)
        def token = jwtService.generateAccessToken(user)
        def tag = makeTag("t5")

        def body = [cardType: 'ARTICLE', status: 'DRAFT', tagIds: [tag.id], simpleLayout: false, links: [], templateTasks: []]

        when:
        def result = postJsonWithAuth("/api/admin/content", body, token)

        then:
        result.andExpect(status().isForbidden())
    }
}
