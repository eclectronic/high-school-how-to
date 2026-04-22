package com.highschoolhowto.auth.oauth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import java.net.URL;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Verifies Google ID tokens against Google's public JWKS.
 * Uses nimbus-jose-jwt (already a project dependency) to avoid pulling in google-api-client.
 * JWKS is fetched lazily by RemoteJWKSet and cached with automatic refresh on unknown kid.
 */
@Component
public class GoogleIdTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleIdTokenVerifier.class);
    private static final String GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> VALID_ISSUERS =
            Set.of("accounts.google.com", "https://accounts.google.com");

    private final ConfigurableJWTProcessor<SecurityContext> jwtProcessor;
    private final String expectedClientId;

    public GoogleIdTokenVerifier(String expectedClientId) {
        this.expectedClientId = expectedClientId;
        try {
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(new URL(GOOGLE_JWKS_URL));
            JWSKeySelector<SecurityContext> keySelector =
                    new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);
            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(keySelector);
            this.jwtProcessor = processor;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize Google ID token verifier", e);
        }
    }

    public GoogleIdTokenPayload verify(String idToken, String expectedNonce) {
        JWTClaimsSet claims;
        try {
            claims = jwtProcessor.process(idToken, null);
        } catch (Exception e) {
            log.warn("Google ID token processing failed: {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            throw new GoogleAuthException("Invalid Google ID token");
        }

        String iss = claims.getIssuer();
        if (!VALID_ISSUERS.contains(iss)) {
            throw new GoogleAuthException("Invalid issuer: " + iss);
        }

        List<String> audience = claims.getAudience();
        if (!audience.contains(expectedClientId)) {
            throw new GoogleAuthException("Token audience does not match client ID");
        }

        Date expiration = claims.getExpirationTime();
        if (expiration == null || expiration.toInstant().isBefore(Instant.now())) {
            throw new GoogleAuthException("Google ID token expired");
        }

        String nonce = (String) claims.getClaim("nonce");
        if (nonce == null || !nonce.equals(expectedNonce)) {
            throw new GoogleAuthException("Nonce mismatch");
        }

        Boolean emailVerified = (Boolean) claims.getClaim("email_verified");
        if (!Boolean.TRUE.equals(emailVerified)) {
            throw new GoogleAuthException("Google email not verified");
        }

        String sub = claims.getSubject();
        String email = (String) claims.getClaim("email");
        String firstName = (String) claims.getClaim("given_name");
        String lastName = (String) claims.getClaim("family_name");
        String picture = (String) claims.getClaim("picture");

        return new GoogleIdTokenPayload(sub, email, firstName, lastName, picture);
    }
}
