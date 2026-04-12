package com.highschoolhowto.locker

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
class LockerLayoutIntegSpec extends BaseIntegrationSpec {

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

    def "get layout returns empty list when no layout saved"() {
        given:
        def user = createActiveUser("layout-empty@example.com")
        def token = tokenFor(user)

        when:
        def resp = getWithAuth("/api/locker/layout", token).andReturn().response

        then:
        resp.status == 200
        objectMapper.readValue(resp.contentAsString, List).size() == 0
    }

    def "save and retrieve layout"() {
        given:
        def user = createActiveUser("layout-save@example.com")
        def token = tokenFor(user)
        def cardA = UUID.randomUUID().toString()
        def cardB = UUID.randomUUID().toString()

        def layout = [items: [
                [cardType: "TASK_LIST", cardId: cardA, col: 1, colSpan: 4, order: 0, minimized: false],
                [cardType: "TASK_LIST", cardId: cardB, col: 5, colSpan: 4, order: 1, minimized: false]
        ]]

        when: "save layout"
        def saveResp = postJsonWithAuth("/api/locker/layout", layout, token).andReturn().response

        then: "layout saved"
        saveResp.status == 200
        def savedItems = objectMapper.readValue(saveResp.contentAsString, List)
        savedItems.size() == 2
        savedItems[0].cardId == cardA
        savedItems[0].order == 0
        savedItems[1].cardId == cardB
        savedItems[1].order == 1

        when: "retrieve layout"
        def getResp = getWithAuth("/api/locker/layout", token).andReturn().response

        then: "layout returned in sort order"
        getResp.status == 200
        def items = objectMapper.readValue(getResp.contentAsString, List)
        items.size() == 2
        items[0].cardId == cardA
        items[1].cardId == cardB
    }

    def "save layout replaces previous layout"() {
        given:
        def user = createActiveUser("layout-replace@example.com")
        def token = tokenFor(user)
        def cardA = UUID.randomUUID().toString()
        def cardB = UUID.randomUUID().toString()
        def cardC = UUID.randomUUID().toString()

        // Save initial layout
        postJsonWithAuth("/api/locker/layout",
                [items: [[cardType: "TASK_LIST", cardId: cardA, col: 1, colSpan: 4, order: 0, minimized: false],
                         [cardType: "TASK_LIST", cardId: cardB, col: 5, colSpan: 4, order: 1, minimized: false]]],
                token).andReturn().response

        when: "save a new layout"
        def newLayout = [items: [[cardType: "TASK_LIST", cardId: cardC, col: 1, colSpan: 4, order: 0, minimized: false]]]
        def saveResp = postJsonWithAuth("/api/locker/layout", newLayout, token).andReturn().response

        then: "new layout returned"
        saveResp.status == 200
        def items = objectMapper.readValue(saveResp.contentAsString, List)
        items.size() == 1
        items[0].cardId == cardC

        when: "retrieve layout"
        def getResp = getWithAuth("/api/locker/layout", token).andReturn().response

        then: "only new layout present"
        def retrieved = objectMapper.readValue(getResp.contentAsString, List)
        retrieved.size() == 1
        retrieved[0].cardId == cardC
    }

    def "user isolation: user B cannot see user A's layout"() {
        given:
        def userA = createActiveUser("layout-a@example.com")
        def userB = createActiveUser("layout-b@example.com")
        def tokenA = tokenFor(userA)
        def tokenB = tokenFor(userB)
        def cardA = UUID.randomUUID().toString()

        when: "user A saves layout"
        postJsonWithAuth("/api/locker/layout",
                [items: [[cardType: "TASK_LIST", cardId: cardA, col: 1, colSpan: 4, order: 0, minimized: false]]],
                tokenA).andReturn().response

        and: "user B retrieves layout"
        def bResp = getWithAuth("/api/locker/layout", tokenB).andReturn().response

        then: "user B sees empty layout"
        bResp.status == 200
        objectMapper.readValue(bResp.contentAsString, List).size() == 0
    }

    def "unauthenticated access returns 401"() {
        when:
        def getResp = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/locker/layout"))
                .andReturn().response

        then:
        getResp.status == 401
    }
}
