package com.highschoolhowto.auth.jwt;

import com.highschoolhowto.config.JwtProperties;
import com.highschoolhowto.user.User;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final JwtProperties properties;
    private final RsaKeyProvider keyProvider;

    public JwtService(JwtProperties properties, RsaKeyProvider keyProvider) {
        this.properties = properties;
        this.keyProvider = keyProvider;
    }

    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", user.getEmail());
        return sign(user.getId(), TokenScope.ACCESS, properties.getAccessTokenTtl(), UUID.randomUUID(), claims);
    }

    public String generateVerificationToken(UUID userId, UUID tokenId) {
        return sign(userId, TokenScope.VERIFY_EMAIL, properties.getVerificationTokenTtl(), tokenId, Map.of());
    }

    public String generatePasswordResetToken(UUID userId, UUID tokenId) {
        return sign(userId, TokenScope.RESET_PASSWORD, properties.getResetTokenTtl(), tokenId, Map.of());
    }

    public JwtPayload parseAndValidate(String token, TokenScope expectedScope) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            if (!signedJWT.verify(new RSASSAVerifier(keyProvider.publicKey()))) {
                throw new JwtValidationException("Invalid JWT signature");
            }
            JWTClaimsSet claimsSet = signedJWT.getJWTClaimsSet();
            if (!properties.getIssuer().equals(claimsSet.getIssuer())) {
                throw new JwtValidationException("Invalid issuer");
            }
            Instant now = Instant.now();
            Instant expiresAt = claimsSet.getExpirationTime().toInstant();
            if (expiresAt.isBefore(now)) {
                throw new JwtValidationException("Token expired");
            }
            String scopeClaim = claimsSet.getStringClaim("scope");
            TokenScope tokenScope = TokenScope.valueOf(scopeClaim);
            if (tokenScope != expectedScope) {
                throw new JwtValidationException("Unexpected scope");
            }
            UUID subject = UUID.fromString(claimsSet.getSubject());
            UUID jwtId = Optional.ofNullable(claimsSet.getJWTID()).map(UUID::fromString).orElse(null);
            return new JwtPayload(
                    subject,
                    tokenScope,
                    Optional.ofNullable(jwtId),
                    claimsSet.getIssueTime().toInstant(),
                    expiresAt,
                    Optional.ofNullable(claimsSet.getStringClaim("email")));
        } catch (ParseException | JOSEException | IllegalArgumentException e) {
            throw new JwtValidationException("Unable to parse token", e);
        }
    }

    private String sign(
            UUID subject,
            TokenScope scope,
            Duration ttl,
            UUID jwtId,
            Map<String, Object> additionalClaims) {
        Instant now = Instant.now();
        Instant expiration = now.plus(ttl);
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .subject(subject.toString())
                .issuer(properties.getIssuer())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiration))
                .claim("scope", scope.name());
        if (jwtId != null) {
            builder.jwtID(jwtId.toString());
        }
        additionalClaims.forEach(builder::claim);
        SignedJWT signedJWT = new SignedJWT(
                new com.nimbusds.jose.JWSHeader(JWSAlgorithm.RS256), builder.build());
        try {
            signedJWT.sign(new RSASSASigner(keyProvider.privateKey()));
            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }
}
