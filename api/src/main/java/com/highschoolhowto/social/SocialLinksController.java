package com.highschoolhowto.social;

import com.highschoolhowto.social.dto.AdminSocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkUpdateRequest;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SocialLinksController {

    private final SocialLinkService service;

    public SocialLinksController(SocialLinkService service) {
        this.service = service;
    }

    @GetMapping("/api/social-links")
    public List<SocialLinkResponse> listPublic() {
        return service.listPublic();
    }

    @GetMapping("/api/admin/social-links")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AdminSocialLinkResponse> listAdmin() {
        return service.listAdmin();
    }

    @PutMapping("/api/admin/social-links/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminSocialLinkResponse update(@PathVariable Long id, @RequestBody SocialLinkUpdateRequest request) {
        return service.update(id, request);
    }
}
