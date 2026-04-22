package com.highschoolhowto.auth;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;


@Component
public class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 10;
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    public List<String> validate(String password) {
        List<String> violations = new ArrayList<>();
        if (password == null || password.length() < MIN_LENGTH) {
            violations.add("Password must be at least 10 characters long.");
        }
        if (password != null && !DIGIT.matcher(password).find()) {
            violations.add("Password must include a number.");
        }
        return violations;
    }
}
