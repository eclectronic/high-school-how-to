package com.highschoolhowto.auth

import com.highschoolhowto.auth.token.EmailVerificationTokenRepository
import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.UserRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integTest")
@Transactional
class AuthFlowIntegSpec extends BaseIntegrationSpec {

    @Autowired
    UserRepository userRepository

    @Autowired
    EmailVerificationTokenRepository emailVerificationTokenRepository

    @Autowired
    JwtService jwtService

    /**
     * End-to-end happy path that ensures a brand new student can:
     * 1. Register and land in a pending state.
     * 2. Confirm their email via the verification link issued by the API.
     * 3. Log in to obtain access/refresh tokens.
     * 4. Use the authenticated endpoints to read and update their profile.
     *
     * The test exercises multiple controllers plus JWT signing/verification, so a single
     * failure highlights a regression anywhere along the auth pipeline.
     */
    def "user can register, verify, login, and update profile"() {
        given:
        // Registration payload uses a random email so reruns never collide with existing data.
        def email = uniqueEmail()
        def password = "Sup3rS3cret!"
        def registerPayload = [
                email    : email,
                password : password,
                firstName: "Sam",
                lastName : "Student"
        ]

        when: "user registers"
        def registerResponse = postJson("/api/auth/register", registerPayload).andReturn().response

        then: "request accepted and user stored in pending state"
        registerResponse.status == 202
        def user = userRepository.findByEmailIgnoreCase(email).orElse(null)
        user != null
        user.status.name() == "PENDING_VERIFICATION"

        when: "verification link is visited"
        // Emulate the email link by pulling the token from the repository and signing it via JwtService.
        def verificationToken = emailVerificationTokenRepository.findAll().find { it.user.id == user.id }
        def signedToken = jwtService.generateVerificationToken(user.id, verificationToken.id)
        def verifyResponse = mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/verify-email")
                .param("token", signedToken)
                .accept(MediaType.APPLICATION_JSON))
                .andReturn().response

        then: "verification succeeds"
        verifyResponse.status == 200
        userRepository.findByEmailIgnoreCase(email).get().status.name() == "ACTIVE"

        when: "user logs in"
        def loginResponse = postJson("/api/auth/login", [email: email, password: password])
                .andReturn().response
        def authBody = objectMapper.readValue(loginResponse.contentAsString, Map)

        then: "tokens issued"
        loginResponse.status == 200
        authBody.accessToken
        authBody.refreshToken

        when: "profile is fetched"
        // Fetch profile with the freshly minted access token to ensure the resource server accepts it.
        def profileResponse = getWithAuth("/api/users/me", authBody.accessToken).andReturn().response
        def profileBody = objectMapper.readValue(profileResponse.contentAsString, Map)

        then: "profile data returned"
        profileResponse.status == 200
        profileBody.email == email
        profileBody.firstName == "Sam"

        when: "profile is updated"
        // Update a couple of mutable profile fields and confirm the changes persist.
        def updatePayload = [bio: "Future valedictorian", gradeLevel: "11"]
        def updateResponse = putJson("/api/users/me", updatePayload, authBody.accessToken)
                .andReturn().response
        def updatedProfile = objectMapper.readValue(updateResponse.contentAsString, Map)

        then: "changes are persisted"
        updateResponse.status == 200
        updatedProfile.bio == "Future valedictorian"
        updatedProfile.gradeLevel == "11"

        when: "password is updated"
        def newPassword = "N3wSup3rS3cret!"
        def passwordPayload = [currentPassword: password, newPassword: newPassword]
        def passwordResponse = putJson("/api/users/me/password", passwordPayload, authBody.accessToken)
                .andReturn().response

        then: "password change succeeds"
        passwordResponse.status == 204

        when: "login with the old password is attempted"
        def legacyLoginResponse = postJson("/api/auth/login", [email: email, password: password]).andReturn().response

        then: "old password no longer works"
        legacyLoginResponse.status == 401

        when: "login with the new password succeeds"
        def refreshedLoginResponse = postJson("/api/auth/login", [email: email, password: newPassword]).andReturn().response
        def refreshedAuthBody = objectMapper.readValue(refreshedLoginResponse.contentAsString, Map)

        then: "new credentials issue tokens"
        refreshedLoginResponse.status == 200
        refreshedAuthBody.accessToken
        refreshedAuthBody.refreshToken
    }

    private static String uniqueEmail() {
        "user-${UUID.randomUUID()}@example.com"
    }
}
