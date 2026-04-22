package com.highschoolhowto.auth.oauth;

import com.highschoolhowto.config.GoogleProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleAuthConfig {

    @Bean
    public GoogleIdTokenVerifier googleIdTokenVerifier(GoogleProperties googleProperties) {
        return new GoogleIdTokenVerifier(googleProperties.getClientId());
    }
}
