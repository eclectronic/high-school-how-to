package com.highschoolhowto.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({JwtProperties.class, AuthLinkProperties.class, StorageProperties.class, GoogleProperties.class})
public class ApplicationConfig {
}
