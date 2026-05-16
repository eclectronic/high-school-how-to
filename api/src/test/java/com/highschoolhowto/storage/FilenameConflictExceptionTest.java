package com.highschoolhowto.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FilenameConflictExceptionTest {

    @Test
    void constructor_setsKey() {
        FilenameConflictException ex = new FilenameConflictException("images/foo.jpeg", "https://cdn.example.com/foo.jpeg");
        assertThat(ex.getKey()).isEqualTo("images/foo.jpeg");
    }

    @Test
    void constructor_setsExistingUrl() {
        FilenameConflictException ex = new FilenameConflictException("images/bar.png", "https://cdn.example.com/bar.png");
        assertThat(ex.getExistingUrl()).isEqualTo("https://cdn.example.com/bar.png");
    }

    @Test
    void constructor_includesKeyInMessage() {
        FilenameConflictException ex = new FilenameConflictException("badges/icon.png", "https://cdn.example.com/icon.png");
        assertThat(ex.getMessage()).contains("badges/icon.png");
    }

    @Test
    void isRuntimeException() {
        FilenameConflictException ex = new FilenameConflictException("k", "u");
        assertThat(ex).isInstanceOf(RuntimeException.class);
    }
}
