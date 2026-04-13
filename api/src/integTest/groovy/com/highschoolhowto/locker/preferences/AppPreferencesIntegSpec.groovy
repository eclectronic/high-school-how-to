package com.highschoolhowto.locker.preferences

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
class AppPreferencesIntegSpec extends BaseIntegrationSpec {

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

    def "GET /api/locker/app-preferences requires auth"() {
        when:
        def response = mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/locker/app-preferences"))
                .andReturn().response

        then:
        response.status == 401
    }

    def "GET /api/locker/app-preferences returns defaults for new user"() {
        given:
        def user = createActiveUser("prefs-defaults@example.com")
        def token = tokenFor(user)

        when:
        def response = getWithAuth("/api/locker/app-preferences", token).andReturn().response

        then:
        response.status == 200
        def body = objectMapper.readValue(response.contentAsString, Map)
        body.activeApps == ["TODO", "NOTES", "TIMER"]
        body.paletteName == "ocean"
        body.paneOrder == null
        body.lockerColor == null
        body.fontFamily == null
    }

    def "PUT /api/locker/app-preferences updates active apps"() {
        given:
        def user = createActiveUser("prefs-update@example.com")
        def token = tokenFor(user)

        when:
        def response = putJson("/api/locker/app-preferences",
                [activeApps: ["TODO", "NOTES"], paletteName: "forest", lockerColor: "#a0c8f0", fontFamily: "serif"], token)
                .andReturn().response

        then:
        response.status == 200
        def body = objectMapper.readValue(response.contentAsString, Map)
        body.activeApps == ["TODO", "NOTES"]
        body.paletteName == "forest"
        body.lockerColor == "#a0c8f0"
        body.fontFamily == "serif"

        when: "fetch preferences to confirm they round-trip"
        def getResponse = getWithAuth("/api/locker/app-preferences", token).andReturn().response

        then:
        getResponse.status == 200
        def getBody = objectMapper.readValue(getResponse.contentAsString, Map)
        getBody.activeApps == ["TODO", "NOTES"]
        getBody.paletteName == "forest"
        getBody.lockerColor == "#a0c8f0"
        getBody.fontFamily == "serif"
    }

    def "PUT /api/locker/app-preferences rejects invalid app identifier"() {
        given:
        def user = createActiveUser("prefs-invalid-app@example.com")
        def token = tokenFor(user)

        when:
        def response = putJson("/api/locker/app-preferences",
                [activeApps: ["TODO", "BOGUS"], paletteName: "ocean"], token)
                .andReturn().response

        then:
        response.status == 422
    }

    def "PUT /api/locker/app-preferences rejects more than 5 apps"() {
        given:
        def user = createActiveUser("prefs-too-many@example.com")
        def token = tokenFor(user)

        when:
        // @Size(max=5) on the DTO catches this before it reaches the service
        def response = putJson("/api/locker/app-preferences",
                [activeApps: ["TODO", "NOTES", "TIMER", "SHORTCUTS", "TODO", "NOTES"], paletteName: "ocean"], token)
                .andReturn().response

        then:
        response.status == 400 || response.status == 422
    }

    def "PUT /api/locker/app-preferences rejects invalid locker color"() {
        given:
        def user = createActiveUser("prefs-bad-color@example.com")
        def token = tokenFor(user)

        when:
        def response = putJson("/api/locker/app-preferences",
                [activeApps: ["TODO"], paletteName: "ocean", lockerColor: "not-a-color"], token)
                .andReturn().response

        then:
        response.status == 400
    }

    def "PUT /api/locker/app-preferences rejects empty app list"() {
        given:
        def user = createActiveUser("prefs-empty@example.com")
        def token = tokenFor(user)

        when:
        // @Size(min=1) on the DTO catches this before it reaches the service
        def response = putJson("/api/locker/app-preferences",
                [activeApps: [], paletteName: "ocean"], token)
                .andReturn().response

        then:
        response.status == 400 || response.status == 422
    }
}
