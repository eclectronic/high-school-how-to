package com.highschoolhowto.auth

import com.highschoolhowto.auth.token.EmailVerificationTokenRepository
import com.highschoolhowto.auth.token.PasswordResetTokenRepository
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
class PasswordResetIntegSpec extends BaseIntegrationSpec {

    @Autowired
    UserRepository userRepository

    @Autowired
    EmailVerificationTokenRepository emailVerificationTokenRepository

    @Autowired
    PasswordResetTokenRepository passwordResetTokenRepository

    @Autowired
    JwtService jwtService

    /**
     * Covers the password-reset journey:
     * 1. A verified user requests a reset link.
     * 2. The system emits a password-reset token (mirroring an email) that we sign with JwtService.
     * 3. The user resets their password, invalidating the old credentials while the new ones succeed.
     *
     * This scenario validates the token repositories, reset controller, and authentication workflow end-to-end.
     */
    def "user can reset password via emailed link"() {
        given:
        // Seed the database with a fully verified user to keep the test focused on reset behavior.
        def email = uniqueEmail()
        def originalPassword = "Orig1nalPass!"
        registerAndVerify(email, originalPassword)

        when: "forgot password is requested"
        // Mimic the API call a user would trigger after receiving the “forgot password” UI prompt.
        def forgotResponse = postJson("/api/auth/forgot-password", [email: email]).andReturn().response

        then:
        forgotResponse.status == 202
        def resetToken = passwordResetTokenRepository.findAll().find { it.user.email == email }
        resetToken != null

        when: "reset link is used"
        // Sign the token with JwtService to simulate the clickable link that would be emailed to the user.
        def jwt = jwtService.generatePasswordResetToken(resetToken.user.id, resetToken.id)
        def resetPayload = [token: jwt, newPassword: "N3wSecretPass!"]
        def resetResponse = postJson("/api/auth/reset-password", resetPayload).andReturn().response

        then:
        resetResponse.status == 200

        when: "login attempted with old password"
        // Old password should be rejected once the reset flow completes.
        def oldLoginResponse = postJson("/api/auth/login", [email: email, password: originalPassword]).andReturn().response

        then:
        oldLoginResponse.status == 401

        when: "login attempted with new password"
        // New password must log in successfully and return fresh tokens.
        def loginResponse = postJson("/api/auth/login", [email: email, password: resetPayload.newPassword]).andReturn().response
        def authBody = objectMapper.readValue(loginResponse.contentAsString, Map)

        then:
        loginResponse.status == 200
        authBody.accessToken
    }

    private void registerAndVerify(String email, String password) {
        postJson("/api/auth/register", [
                email    : email,
                password : password,
                firstName: "Alex",
                lastName : "Reset"
        ]).andReturn()

        def user = userRepository.findByEmailIgnoreCase(email).orElseThrow()
        def verificationToken = emailVerificationTokenRepository.findAll().find { it.user.id == user.id }
        def jwt = jwtService.generateVerificationToken(user.id, verificationToken.id)
        mockMvc.perform(MockMvcRequestBuilders.get("/api/auth/verify-email")
                .param("token", jwt)
                .accept(MediaType.APPLICATION_JSON))
                .andReturn()
    }

    private static String uniqueEmail() {
        "reset-${UUID.randomUUID()}@example.com"
    }
}
