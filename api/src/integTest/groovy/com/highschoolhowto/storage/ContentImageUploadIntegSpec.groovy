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
class ContentImageUploadIntegSpec extends BaseIntegrationSpec {

    @Autowired
    UserRepository userRepository

    @Autowired
    JwtService jwtService

    @MockBean
    S3StorageService s3StorageService

    // A minimal valid 1x1 JPEG — same bytes used by UserIconUploadIntegSpec
    private static final byte[] TINY_JPEG = [
        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        (byte) 0xFF, (byte) 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06,
        0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07,
        0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C,
        0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14,
        0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C,
        0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23,
        0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31,
        0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38,
        0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, (byte) 0xFF, (byte) 0xC0,
        0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
        0x01, 0x11, 0x00, (byte) 0xFF, (byte) 0xC4, 0x00, 0x1F, 0x00,
        0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0A, 0x0B, (byte) 0xFF, (byte) 0xC4, 0x00, (byte) 0xB5,
        0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04,
        0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01,
        0x7D, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05,
        0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61,
        0x07, 0x22, 0x71, 0x14, 0x32, (byte) 0x81, (byte) 0x91, (byte) 0xA1,
        0x08, 0x23, 0x42, (byte) 0xB1, (byte) 0xC1, 0x15, 0x52, (byte) 0xD1,
        (byte) 0xF0, 0x24, 0x33, 0x62, 0x72, (byte) 0x82, 0x09, 0x0A,
        0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27,
        0x28, 0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38,
        0x39, 0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
        0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
        0x59, 0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
        0x69, 0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78,
        0x79, 0x7A, (byte) 0x83, (byte) 0x84, (byte) 0x85, (byte) 0x86, (byte) 0x87, (byte) 0x88,
        (byte) 0x89, (byte) 0x8A, (byte) 0x92, (byte) 0x93, (byte) 0x94, (byte) 0x95, (byte) 0x96, (byte) 0x97,
        (byte) 0x98, (byte) 0x99, (byte) 0x9A, (byte) 0xA2, (byte) 0xA3, (byte) 0xA4, (byte) 0xA5, (byte) 0xA6,
        (byte) 0xA7, (byte) 0xA8, (byte) 0xA9, (byte) 0xAA, (byte) 0xB2, (byte) 0xB3, (byte) 0xB4, (byte) 0xB5,
        (byte) 0xB6, (byte) 0xB7, (byte) 0xB8, (byte) 0xB9, (byte) 0xBA, (byte) 0xC2, (byte) 0xC3, (byte) 0xC4,
        (byte) 0xC5, (byte) 0xC6, (byte) 0xC7, (byte) 0xC8, (byte) 0xC9, (byte) 0xCA, (byte) 0xD2, (byte) 0xD3,
        (byte) 0xD4, (byte) 0xD5, (byte) 0xD6, (byte) 0xD7, (byte) 0xD8, (byte) 0xD9, (byte) 0xDA, (byte) 0xE1,
        (byte) 0xE2, (byte) 0xE3, (byte) 0xE4, (byte) 0xE5, (byte) 0xE6, (byte) 0xE7, (byte) 0xE8, (byte) 0xE9,
        (byte) 0xEA, (byte) 0xF1, (byte) 0xF2, (byte) 0xF3, (byte) 0xF4, (byte) 0xF5, (byte) 0xF6, (byte) 0xF7,
        (byte) 0xF8, (byte) 0xF9, (byte) 0xFA, (byte) 0xFF, (byte) 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00,
        0x00, 0x3F, 0x00, (byte) 0xFB, 0x28, (byte) 0xA2, (byte) 0x80, 0x0A, 0x28, (byte) 0xA2,
        (byte) 0x80, (byte) 0xFF, (byte) 0xD9
    ] as byte[]

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

    private String tokenFor(User user) {
        jwtService.generateAccessToken(user)
    }

    def "POST /api/admin/images/upload/content requires ADMIN role — user token returns 403"() {
        given:
        def user = createActiveUser("content-upload-user@example.com")
        def token = tokenFor(user)
        def file = new MockMultipartFile("file", "image.jpeg", "image/jpeg", TINY_JPEG)

        when:
        def response = mockMvc.perform(
                MockMvcRequestBuilders.multipart("/api/admin/images/upload/content")
                        .file(file)
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andReturn().response

        then:
        response.status == 403
    }

    def "POST /api/admin/images/upload/content without auth returns 401"() {
        given:
        def file = new MockMultipartFile("file", "image.jpeg", "image/jpeg", TINY_JPEG)

        when:
        def response = mockMvc.perform(
                MockMvcRequestBuilders.multipart("/api/admin/images/upload/content")
                        .file(file)
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andReturn().response

        then:
        response.status == 401
    }

    def "POST /api/admin/images/upload/content with valid JPEG returns 200 and URL"() {
        given:
        def admin = createAdminUser("content-upload-admin@example.com")
        def token = tokenFor(admin)
        def expectedUrl = "https://cdn.example.com/content/test-uuid.jpeg"

        when(s3StorageService.generateFilename(anyString())).thenReturn("test-uuid.jpeg")
        when(s3StorageService.upload(any(byte[].class), anyString(), anyString(), anyString()))
                .thenReturn(expectedUrl)

        def file = new MockMultipartFile("file", "photo.jpeg", "image/jpeg", TINY_JPEG)

        when:
        def response = mockMvc.perform(
                MockMvcRequestBuilders.multipart("/api/admin/images/upload/content")
                        .file(file)
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andReturn().response

        then:
        response.status == 200
        def body = objectMapper.readValue(response.contentAsString, Map)
        body.url == expectedUrl
        body.thumbnailUrl == null
    }

    def "POST /api/admin/images/upload/content with no file returns 400"() {
        given:
        def admin = createAdminUser("content-upload-nofile@example.com")
        def token = tokenFor(admin)
        // Send an empty file to trigger the "no file provided" validation
        def emptyFile = new MockMultipartFile("file", "empty.jpeg", "image/jpeg", new byte[0])

        when:
        def response = mockMvc.perform(
                MockMvcRequestBuilders.multipart("/api/admin/images/upload/content")
                        .file(emptyFile)
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.MULTIPART_FORM_DATA_VALUE))
                .andReturn().response

        then:
        response.status == 400
    }
}
