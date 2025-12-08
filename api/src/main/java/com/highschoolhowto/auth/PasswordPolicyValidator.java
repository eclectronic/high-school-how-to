package com.highschoolhowto.auth;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 12;
    private static final Pattern UPPER = Pattern.compile("[A-Z]");
    private static final Pattern LOWER = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SYMBOL = Pattern.compile("[^A-Za-z0-9]");

    public List<String> validate(String password) {
        List<String> violations = new ArrayList<>();
        if (password == null || password.length() < MIN_LENGTH) {
            violations.add("Password must be at least 12 characters long.");
        }
        if (password != null) {
            if (!UPPER.matcher(password).find()) {
                violations.add("Password must include an uppercase letter.");
            }
            if (!LOWER.matcher(password).find()) {
                violations.add("Password must include a lowercase letter.");
            }
            if (!DIGIT.matcher(password).find()) {
                violations.add("Password must include a number.");
            }
            if (!SYMBOL.matcher(password).find()) {
                violations.add("Password must include a symbol.");
            }
        }
        return violations;
    }
}
