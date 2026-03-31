package com.highschoolhowto.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.links")
public class AuthLinkProperties {

    /**
     * Base URL that will be used to build verification links, token appended via {@code ?token=...}.
     */
    private String verification = "http://localhost:8080/api/auth/verify-email";

    /**
     * Where to redirect the user after verification (dialog shown client-side).
     */
    private String verificationRedirect = "http://localhost:4200/auth/login";

    /**
     * Base URL the frontend uses to host the password reset page (token appended as query param).
     */
    private String reset = "http://localhost:4200/auth/reset-password";

    public String getVerification() {
        return verification;
    }

    public void setVerification(String verification) {
        this.verification = verification;
    }

    public String getVerificationRedirect() {
        return verificationRedirect;
    }

    public void setVerificationRedirect(String verificationRedirect) {
        this.verificationRedirect = verificationRedirect;
    }

    public String getReset() {
        return reset;
    }

    public void setReset(String reset) {
        this.reset = reset;
    }
}
