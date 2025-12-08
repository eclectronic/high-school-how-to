package com.highschoolhowto.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.Resource;

@ConfigurationProperties(prefix = "auth.jwt")
public class JwtProperties {

    private String issuer = "highschoolhowto-api";
    private Duration accessTokenTtl = Duration.ofMinutes(15);
    private Duration refreshTokenTtl = Duration.ofDays(7);
    private Duration verificationTokenTtl = Duration.ofHours(24);
    private Duration resetTokenTtl = Duration.ofMinutes(15);
    private Resource privateKeyPath;
    private Resource publicKeyPath;

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public Duration getAccessTokenTtl() {
        return accessTokenTtl;
    }

    public void setAccessTokenTtl(Duration accessTokenTtl) {
        this.accessTokenTtl = accessTokenTtl;
    }

    public Duration getRefreshTokenTtl() {
        return refreshTokenTtl;
    }

    public void setRefreshTokenTtl(Duration refreshTokenTtl) {
        this.refreshTokenTtl = refreshTokenTtl;
    }

    public Duration getVerificationTokenTtl() {
        return verificationTokenTtl;
    }

    public void setVerificationTokenTtl(Duration verificationTokenTtl) {
        this.verificationTokenTtl = verificationTokenTtl;
    }

    public Duration getResetTokenTtl() {
        return resetTokenTtl;
    }

    public void setResetTokenTtl(Duration resetTokenTtl) {
        this.resetTokenTtl = resetTokenTtl;
    }

    public Resource getPrivateKeyPath() {
        return privateKeyPath;
    }

    public void setPrivateKeyPath(Resource privateKeyPath) {
        this.privateKeyPath = privateKeyPath;
    }

    public Resource getPublicKeyPath() {
        return publicKeyPath;
    }

    public void setPublicKeyPath(Resource publicKeyPath) {
        this.publicKeyPath = publicKeyPath;
    }
}
