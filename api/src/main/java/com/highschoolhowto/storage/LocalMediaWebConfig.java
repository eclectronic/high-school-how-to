package com.highschoolhowto.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@ConditionalOnProperty(name = "storage.local.enabled", havingValue = "true")
public class LocalMediaWebConfig implements WebMvcConfigurer {

    private final String mediaPath;

    public LocalMediaWebConfig(
            @Value("${storage.local.media-path:/workspace/media}") String mediaPath) {
        this.mediaPath = mediaPath;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/uploads/**")
                .addResourceLocations("file:" + mediaPath + "/uploads/");
    }
}
