package com.highschoolhowto.note

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.User
import com.highschoolhowto.user.UserRepository
import com.highschoolhowto.user.UserRole
import com.highschoolhowto.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integTest")
@Transactional
class NoteOrderIntegSpec extends BaseIntegrationSpec {

    @Autowired
    UserRepository userRepository

    @Autowired
    JwtService jwtService

    private User createActiveUser(String email) {
        def user = new User()
        user.email = email
        user.firstName = "Test"
        user.lastName = "User"
        user.passwordHash = "irrelevant"
        user.status = UserStatus.ACTIVE
        user.role = UserRole.USER
        return userRepository.save(user)
    }

    private String tokenFor(User user) {
        jwtService.generateAccessToken(user)
    }

    def "GET /api/notes returns sortOrder, createdAt, updatedAt on the response"() {
        given:
        def user = createActiveUser("note-fields@example.com")
        def token = tokenFor(user)

        when:
        def createResp = postJsonWithAuth("/api/notes",
                [title: "First", content: "hello", color: "#fef3c7"], token)
                .andReturn().response

        then:
        createResp.status == 200
        def created = objectMapper.readValue(createResp.contentAsString, Map)
        created.sortOrder == 0
        created.createdAt != null
        created.updatedAt != null

        when:
        def listResp = getWithAuth("/api/notes", token).andReturn().response

        then:
        listResp.status == 200
        def notes = objectMapper.readValue(listResp.contentAsString, List)
        notes.size() == 1
        notes[0].sortOrder == 0
        notes[0].createdAt != null
        notes[0].updatedAt != null
    }

    def "POST /api/notes/reorder rewrites sortOrder to match the supplied id order"() {
        given:
        def user = createActiveUser("note-reorder@example.com")
        def token = tokenFor(user)

        // Create three notes. Each create prepends to the list (sortOrder 0),
        // shifting the rest down. After three creates, the order is [C, B, A].
        def a = objectMapper.readValue(
                postJsonWithAuth("/api/notes", [title: "A"], token).andReturn().response.contentAsString, Map)
        def b = objectMapper.readValue(
                postJsonWithAuth("/api/notes", [title: "B"], token).andReturn().response.contentAsString, Map)
        def c = objectMapper.readValue(
                postJsonWithAuth("/api/notes", [title: "C"], token).andReturn().response.contentAsString, Map)

        when: "reorder to [A, B, C]"
        def reorderResp = putJson("/api/notes/reorder",
                [ids: [a.id, b.id, c.id]], token).andReturn().response


        then:
        reorderResp.status == 204

        when:
        def listResp = getWithAuth("/api/notes", token).andReturn().response

        then:
        listResp.status == 200
        def notes = objectMapper.readValue(listResp.contentAsString, List)
        notes*.title == ["A", "B", "C"]
        notes*.sortOrder == [0, 1, 2]
    }

    def "reorder ignores ids belonging to other users"() {
        given:
        def userA = createActiveUser("owner-a@example.com")
        def userB = createActiveUser("stranger-b@example.com")
        def tokenA = tokenFor(userA)
        def tokenB = tokenFor(userB)

        def aNote = objectMapper.readValue(
                postJsonWithAuth("/api/notes", [title: "A-note"], tokenA).andReturn().response.contentAsString, Map)
        def bNote = objectMapper.readValue(
                postJsonWithAuth("/api/notes", [title: "B-note"], tokenB).andReturn().response.contentAsString, Map)

        when: "user B posts a reorder mentioning user A's note id"
        def resp = putJson("/api/notes/reorder",
                [ids: [aNote.id, bNote.id]], tokenB).andReturn().response

        then: "accepted (204) but user A's note is untouched"
        resp.status == 204

        when:
        def aList = objectMapper.readValue(
                getWithAuth("/api/notes", tokenA).andReturn().response.contentAsString, List)

        then: "user A still sees their note at sortOrder 0 (unchanged)"
        aList.size() == 1
        aList[0].id == aNote.id
        aList[0].sortOrder == 0
    }

    def "reorder requires authentication"() {
        when:
        def resp = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .put("/api/notes/reorder")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes([ids: []])))
                .andReturn().response

        then:
        resp.status == 401
    }
}
