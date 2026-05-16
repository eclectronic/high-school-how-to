package com.highschoolhowto.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for StorageService.generateFilename(String, String, String) which
 * exercises the private sanitizeBaseName helper via the default interface method.
 */
@ExtendWith(MockitoExtension.class)
class StorageServiceSanitizeTest {

    @Mock
    StorageService storage;

    // Re-use the default method under test by delegating to it from a concrete wrapper.
    // The @Mock only mocks abstract methods; we call the default method directly on
    // the mock since Mockito preserves default interface methods.

    private String sanitize(String canonicalName, String ext, String subfolder) {
        // By default objectExists returns false (mock returns false for boolean)
        when(storage.generateFilename(anyString(), anyString(), anyString()))
                .thenCallRealMethod();
        return storage.generateFilename(canonicalName, ext, subfolder);
    }

    @Test
    void titleSource_simpleTitle_producesSlug() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String result = storage.generateFilename("Study Tips", "jpeg", "images");
        assertThat(result).isEqualTo("study-tips.jpeg");
    }

    @Test
    void filenameSource_stripsPathSeparators() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String result = storage.generateFilename("/home/user/photos/My Photo.png", "png", "images");
        assertThat(result).isEqualTo("my-photo.png");
    }

    @Test
    void filenameSource_stripsWindowsPathSeparators() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String result = storage.generateFilename("C:\\Users\\ron\\docs\\Cover Image.jpeg", "jpeg", "images");
        assertThat(result).isEqualTo("cover-image.jpeg");
    }

    @Test
    void filenameSource_dropsExtension() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        // The canonicalName has a .jpeg extension; it should be stripped and replaced with ext param
        String result = storage.generateFilename("badge-icon.jpeg", "png", "badges");
        assertThat(result).isEqualTo("badge-icon.png");
    }

    @Test
    void nonAsciiChars_replacedWithHyphen() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String result = storage.generateFilename("Ünïcödé Tïtle", "jpeg", "images");
        // Non-[a-z0-9] chars become hyphens; leading/trailing hyphens trimmed
        assertThat(result).matches("[a-z0-9-]+\\.jpeg");
        assertThat(result).doesNotStartWith("-");
        assertThat(result).doesNotEndWith("-.jpeg");
    }

    @Test
    void blankName_fallsBackToImage() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String result = storage.generateFilename("   ", "jpeg", "images");
        assertThat(result).isEqualTo("image.jpeg");
    }

    @Test
    void nullName_fallsBackToImage() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(org.mockito.ArgumentMatchers.nullable(String.class), anyString(), anyString()))
                .thenCallRealMethod();

        String result = storage.generateFilename((String) null, "png", "images");
        assertThat(result).isEqualTo("image.png");
    }

    @Test
    void longName_truncatedTo64Chars() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String longTitle = "a".repeat(100);
        String result = storage.generateFilename(longTitle, "jpeg", "images");
        // base portion (before ".jpeg") must be <= 64 chars
        String base = result.substring(0, result.lastIndexOf('.'));
        assertThat(base.length()).isLessThanOrEqualTo(64);
    }

    @Test
    void existingKey_throwsFilenameConflictException() {
        when(storage.objectExists("images/study-tips.jpeg")).thenReturn(true);
        when(storage.buildPublicUrl(anyString())).thenReturn("https://cdn.example.com/uploads/images/study-tips.jpeg");
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        assertThatThrownBy(() -> storage.generateFilename("Study Tips", "jpeg", "images"))
                .isInstanceOf(FilenameConflictException.class)
                .satisfies(ex -> {
                    FilenameConflictException fce = (FilenameConflictException) ex;
                    assertThat(fce.getKey()).isEqualTo("images/study-tips.jpeg");
                    assertThat(fce.getExistingUrl()).contains("study-tips.jpeg");
                });
    }

    @Test
    void conflictException_keyAndUrlStoredCorrectly() {
        FilenameConflictException ex = new FilenameConflictException("images/foo.jpeg", "https://cdn.example.com/foo.jpeg");
        assertThat(ex.getKey()).isEqualTo("images/foo.jpeg");
        assertThat(ex.getExistingUrl()).isEqualTo("https://cdn.example.com/foo.jpeg");
        assertThat(ex.getMessage()).contains("images/foo.jpeg");
    }

    @Test
    void nonExistingKey_returnsFilename() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        String result = storage.generateFilename("My Badge", "png", "badges");
        assertThat(result).isEqualTo("my-badge.png");
    }

    @Test
    void onlySpecialChars_fallsBackToImage() {
        when(storage.objectExists(anyString())).thenReturn(false);
        when(storage.generateFilename(anyString(), anyString(), anyString())).thenCallRealMethod();

        // After stripping extension "!!!" becomes "" -> "image"
        String result = storage.generateFilename("!!!.jpg", "jpeg", "images");
        assertThat(result).isEqualTo("image.jpeg");
    }
}
