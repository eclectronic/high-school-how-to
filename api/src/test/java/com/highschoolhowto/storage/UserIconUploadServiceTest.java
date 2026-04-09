package com.highschoolhowto.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.highschoolhowto.web.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class UserIconUploadServiceTest {

    @Mock
    S3StorageService s3StorageService;

    @InjectMocks
    UserIconUploadService service;

    private static final UUID USER_ID = UUID.randomUUID();

    // A minimal valid 1x1 JPEG (JFIF format)
    private static final byte[] TINY_JPEG = new byte[]{
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
    };

    @Test
    void uploadIcon_validJpeg_returnsIconUrl() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.jpeg", "image/jpeg", TINY_JPEG);
        String prefix = "media/icons/" + USER_ID + "/";
        when(s3StorageService.keyPrefix("icons/" + USER_ID + "/")).thenReturn(prefix);
        when(s3StorageService.countObjects(prefix)).thenReturn(0);
        when(s3StorageService.generateFilename(anyString())).thenReturn("abc.jpeg");
        when(s3StorageService.upload(any(), eq("abc.jpeg"), eq("image/jpeg"), anyString()))
                .thenReturn("https://cdn.example.com/media/icons/" + USER_ID + "/abc.jpeg");

        String result = service.uploadIcon(file, USER_ID);

        assertThat(result).contains("media/icons/" + USER_ID);
    }

    @Test
    void uploadIcon_fileTooLarge_throws400() {
        byte[] bigData = new byte[(int) (UserIconUploadService.MAX_FILE_SIZE + 1)];
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.jpeg", "image/jpeg", bigData);

        assertThatThrownBy(() -> service.uploadIcon(file, USER_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void uploadIcon_unsupportedTypeGif_throws415() {
        byte[] data = new byte[]{0x47, 0x49, 0x46, 0x38}; // GIF magic
        MockMultipartFile file = new MockMultipartFile(
                "file", "anim.gif", "image/gif", data);

        assertThatThrownBy(() -> service.uploadIcon(file, USER_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE));
    }

    @Test
    void uploadIcon_perUserLimitExceeded_throws422() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.png", "image/png", new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47});
        String prefix = "media/icons/" + USER_ID + "/";
        when(s3StorageService.keyPrefix("icons/" + USER_ID + "/")).thenReturn(prefix);
        when(s3StorageService.countObjects(prefix))
                .thenReturn(UserIconUploadService.MAX_ICONS_PER_USER);

        assertThatThrownBy(() -> service.uploadIcon(file, USER_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));
    }

    @Test
    void uploadIcon_emptyFile_throws400() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> service.uploadIcon(file, USER_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void uploadIcon_svgNotResized_uploadedAsIs() {
        byte[] svgBytes = "<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.svg", "image/svg+xml", svgBytes);
        String prefix = "media/icons/" + USER_ID + "/";
        when(s3StorageService.keyPrefix("icons/" + USER_ID + "/")).thenReturn(prefix);
        when(s3StorageService.countObjects(prefix)).thenReturn(0);
        when(s3StorageService.generateFilename(anyString())).thenReturn("abc.svg");
        when(s3StorageService.upload(eq(svgBytes), eq("abc.svg"), eq("image/svg+xml"), anyString()))
                .thenReturn("https://cdn.example.com/media/icons/" + USER_ID + "/abc.svg");

        String result = service.uploadIcon(file, USER_ID);

        assertThat(result).endsWith(".svg");
    }
}
