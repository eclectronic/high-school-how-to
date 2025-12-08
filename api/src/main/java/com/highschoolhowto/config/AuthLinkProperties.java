package com.highschoolhowto.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.links")
public class AuthLinkProperties {

    /**
     * Base URL that will be used to build verification links, token appended via {@code ?token=...}.
     */
    private String verification = "http://localhost:8080/api/auth/verify-email";

    /**
     * Base URL the frontend uses to host the password reset page (token appended as query param).
     */
    private String reset = "http://localhost:4200/reset-password";

    public String getVerification() {
        return verification;
    }

    public void setVerification(String verification) {
        this.verification = verification;
    }

    public String getReset() {
        return reset;
    }

    public void setReset(String reset) {
        this.reset = reset;
    }
}
