package com.highschoolhowto.storage

import com.highschoolhowto.auth.jwt.JwtService
import com.highschoolhowto.support.BaseIntegrationSpec
import com.highschoolhowto.user.User
import com.highschoolhowto.user.UserRepository
import com.highschoolhowto.user.UserRole
import com.highschoolhowto.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import org.springframework.transaction.annotation.Transactional

import static org.mockito.ArgumentMatchers.any
import static org.mockito.ArgumentMatchers.anyString
import static org.mockito.Mockito.when

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integTest")
@Transactional
class UserIconUploadIntegSpec extends BaseIntegrationSpec {

    @Autowired
    UserRepository userRepository

    @Autowired
    JwtService jwtService

    @MockBean
    S3StorageService s3StorageService

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

    // A minimal valid 1x1 PNG
    private static final byte[] TINY_PNG = [
        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR length + type
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixels
        0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53, (byte) 0xDE, // bit depth, colour type, CRC
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT length + type
        0x08, (byte) 0xD7, 0x63, (byte) 0xF8, (byte) 0xCF, (byte) 0xC0, 0x00, 0x00, 0x00, (byte) 0x82,
        0x00, 0x01, (byte) 0xE2, 0x21, (byte) 0xBC, 0x33, // IDAT data + CRC
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND length + type
        (byte) 0xAE, 0x42, 0x60, (byte) 0x82  // IEND CRC
    ] as byte[]

    def "upload valid PNG returns iconUrl in media path"() {
        given:
        def user = createActiveUser("icon-upload@example.com")
        def token = tokenFor(user)
        def expectedUrl = "/media/icons/${user.id}/test-uuid.png"

        when(s3StorageService.keyPrefix(anyString())).thenReturn("media/icons/${user.id}/".toString())
        when(s3StorageService.countObjects(anyString())).thenReturn(0)
        when(s3StorageService.generateFilename(anyString())).thenReturn("test-uuid.png")
        when(s3StorageService.upload(any(byte[].class), anyString(), anyString(), anyString()))
                .thenReturn(expectedUrl.toString())

        def file = new MockMultipartFile("file", "icon.png", "image/png", TINY_PNG)

        when:
        def response = mockMvc.perform(
                MockMvcRequestBuilders.multipart("/api/uploads/icons")
                        .file(file)
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andReturn().response

        then:
        response.status == 200
        def body = objectMapper.readValue(response.contentAsString, Map)
        body.iconUrl == expectedUrl
        body.iconUrl.contains("media/icons/${user.id}")
    }

    def "upload without auth returns 401"() {
        given:
        def file = new MockMultipartFile("file", "icon.png", "image/png", TINY_PNG)

        when:
        def response = mockMvc.perform(
                MockMvcRequestBuilders.multipart("/api/uploads/icons")
                        .file(file)
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andReturn().response

        then:
        response.status == 401
    }
}
