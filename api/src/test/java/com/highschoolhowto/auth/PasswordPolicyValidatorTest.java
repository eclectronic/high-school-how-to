package com.highschoolhowto.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PasswordPolicyValidatorTest {

    private final PasswordPolicyValidator validator = new PasswordPolicyValidator();

    @Test
    void acceptsPasswordAtMinLengthWithDigit() {
        // 10 chars (the minimum) + a digit -> no violations.
        // This is the regression test for the bug where the RegistrationRequest DTO
        // required @Size(min = 12) while the policy required only 10, causing 10- and
        // 11-character passwords to be rejected at the controller boundary with a
        // generic 400 error.
        List<String> violations = validator.validate("password12");
        assertThat(violations).isEmpty();
    }

    @Test
    void acceptsLongPasswordWithDigit() {
        assertThat(validator.validate("a-much-longer-password-with-1-digit")).isEmpty();
    }

    @Test
    void rejectsShortPassword() {
        List<String> violations = validator.validate("short1");
        assertThat(violations).contains("Password must be at least 10 characters long.");
    }

    @Test
    void rejectsPasswordWithoutDigit() {
        List<String> violations = validator.validate("no-digit-here");
        assertThat(violations).contains("Password must include a number.");
    }

    @Test
    void rejectsNullPassword() {
        List<String> violations = validator.validate(null);
        assertThat(violations).contains("Password must be at least 10 characters long.");
    }

    @Test
    void reportsBothViolationsTogether() {
        List<String> violations = validator.validate("short");
        assertThat(violations).containsExactlyInAnyOrder(
                "Password must be at least 10 characters long.",
                "Password must include a number.");
    }
}
