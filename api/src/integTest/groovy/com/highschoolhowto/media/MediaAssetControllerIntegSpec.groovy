package com.highschoolhowto.media

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.content.card.CardStatus
import com.highschoolhowto.content.card.CardType
import com.highschoolhowto.content.card.ContentCard
import com.highschoolhowto.content.card.ContentCardRepository
import com.highschoolhowto.content.tag.Tag
import com.highschoolhowto.content.tag.TagRepository
import com.highschoolhowto.storage.StorageService
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.User
import com.highschoolhowto.user.UserRepository
import com.highschoolhowto.user.UserRole
import com.highschoolhowto.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders

import static org.mockito.ArgumentMatchers.anyString
import static org.mockito.Mockito.doNothing
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Integration tests for /api/admin/media endpoints.
 */
class MediaAssetControllerIntegSpec extends BaseIntegrationSpec {

    @Autowired MediaAssetRepository mediaAssetRepository
    @Autowired UserRepository userRepository
    @Autowired JwtService jwtService
    @Autowired ContentCardRepository cardRepository
    @Autowired TagRepository tagRepository

    @MockBean StorageService storageService

    private final String prefix = "media-ctrl-${UUID.randomUUID()}-"

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
        user.firstName = "User"
        user.lastName = "User"
        user.passwordHash = "irrelevant"
        user.status = UserStatus.ACTIVE
        user.role = UserRole.USER
        return userRepository.save(user)
    }

    private MediaAsset makeAsset(String urlSuffix) {
        MediaAsset asset = new MediaAsset()
        asset.url = "https://cdn.example.com/${prefix}${urlSuffix}.jpeg"
        asset.filename = "${urlSuffix}.jpeg"
        asset.mimeType = "image/jpeg"
        asset.sizeBytes = 1024L
        mediaAssetRepository.save(asset)
    }

    // ── GET /api/admin/media ──────────────────────────────────────────────────────

    def "GET /api/admin/media returns 200 with paged results for admin"() {
        given:
        def admin = createAdminUser("media-list-admin@example.com")
        def token = jwtService.generateAccessToken(admin)
        makeAsset("asset-a")
        makeAsset("asset-b")

        when:
        def result = getWithAuth("/api/admin/media", token)

        then:
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.content').isArray())
    }

    def "GET /api/admin/media returns 403 for regular user"() {
        given:
        def user = createRegularUser("media-list-user@example.com")
        def token = jwtService.generateAccessToken(user)

        when:
        def result = getWithAuth("/api/admin/media", token)

        then:
        result.andExpect(status().isForbidden())
    }

    def "GET /api/admin/media returns 401 without auth"() {
        when:
        def result = mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/media"))

        then:
        result.andExpect(status().isUnauthorized())
    }

    // ── DELETE /api/admin/media/{id} ──────────────────────────────────────────────

    def "DELETE /api/admin/media/{id} returns 204 for an unused asset"() {
        given:
        def admin = createAdminUser("media-delete-admin@example.com")
        def token = jwtService.generateAccessToken(admin)
        def asset = makeAsset("delete-target")
        doNothing().when(storageService).delete(anyString())

        when:
        def result = deleteWithAuth("/api/admin/media/${asset.id}", token)

        then:
        result.andExpect(status().isNoContent())
        !mediaAssetRepository.findById(asset.id).isPresent()
    }

    def "DELETE /api/admin/media/{id} returns 409 when asset is in use by a content card"() {
        given:
        def admin = createAdminUser("media-delete-in-use@example.com")
        def token = jwtService.generateAccessToken(admin)
        def asset = makeAsset("in-use-asset")

        // Create a content card that references this asset URL as thumbnailUrl
        Tag tag = new Tag()
        tag.slug = prefix + "del-tag"
        tag.name = "Del Tag"
        tagRepository.save(tag)

        ContentCard card = new ContentCard()
        card.slug = prefix + "card-with-asset"
        card.title = "Card with asset"
        card.cardType = CardType.ARTICLE
        card.status = CardStatus.PUBLISHED
        card.thumbnailUrl = asset.url
        card.tags = [tag]
        cardRepository.save(card)

        when:
        def result = deleteWithAuth("/api/admin/media/${asset.id}", token)

        then:
        result.andExpect(status().isConflict())
    }

    def "DELETE /api/admin/media/{id} returns 404 for non-existent asset"() {
        given:
        def admin = createAdminUser("media-delete-404@example.com")
        def token = jwtService.generateAccessToken(admin)

        when:
        def result = deleteWithAuth("/api/admin/media/999999999", token)

        then:
        result.andExpect(status().isNotFound())
    }

    // ── GET /api/admin/media/{id}/usage ──────────────────────────────────────────

    def "GET /api/admin/media/{id}/usage returns 200 with count"() {
        given:
        def admin = createAdminUser("media-usage-admin@example.com")
        def token = jwtService.generateAccessToken(admin)
        def asset = makeAsset("usage-target")

        when:
        def result = getWithAuth("/api/admin/media/${asset.id}/usage", token)

        then:
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.count').isNumber())
    }

    // ── PATCH /api/admin/media/{id} ───────────────────────────────────────────────

    def "PATCH /api/admin/media/{id} updates altText and filename"() {
        given:
        def admin = createAdminUser("media-patch-admin@example.com")
        def token = jwtService.generateAccessToken(admin)
        def asset = makeAsset("patch-target")

        def body = [altText: "New alt text", filename: "new-name.jpeg"]

        when:
        def result = mockMvc.perform(
                MockMvcRequestBuilders.patch("/api/admin/media/${asset.id}")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer ${token}")
                        .content(objectMapper.writeValueAsBytes(body)))

        then:
        result.andExpect(status().isOk())
              .andExpect(jsonPath('$.altText').value("New alt text"))
              .andExpect(jsonPath('$.filename').value("new-name.jpeg"))
    }
}
