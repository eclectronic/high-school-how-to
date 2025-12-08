package com.highschoolhowto.auth.jwt;

import com.highschoolhowto.config.JwtProperties;
import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.regex.Pattern;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
public class RsaKeyProvider {

    private static final Pattern PEM_HEADER_FOOTER =
            Pattern.compile("-----BEGIN (?:.*)-----|-----END (?:.*)-----|\\s");

    private final JwtProperties properties;
    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;

    public RsaKeyProvider(JwtProperties properties) {
        this.properties = properties;
        try {
            this.privateKey = loadPrivateKey(properties.getPrivateKeyPath());
            this.publicKey = loadPublicKey(properties.getPublicKeyPath());
        } catch (IOException | GeneralSecurityException e) {
            throw new IllegalStateException("Unable to load RSA keys", e);
        }
    }

    public RSAPrivateKey privateKey() {
        return privateKey;
    }

    public RSAPublicKey publicKey() {
        return publicKey;
    }

    private RSAPrivateKey loadPrivateKey(Resource resource) throws IOException, GeneralSecurityException {
        byte[] keyBytes = decodePem(resource);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) factory.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
    }

    private RSAPublicKey loadPublicKey(Resource resource) throws IOException, GeneralSecurityException {
        byte[] keyBytes = decodePem(resource);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) factory.generatePublic(new X509EncodedKeySpec(keyBytes));
    }

    private byte[] decodePem(Resource resource) throws IOException {
        try (InputStream inputStream = resource.getInputStream()) {
            String pem = new String(inputStream.readAllBytes());
            String sanitized = PEM_HEADER_FOOTER.matcher(pem).replaceAll("");
            return Base64.getDecoder().decode(sanitized);
        }
    }
}
