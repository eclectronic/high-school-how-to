package com.highschoolhowto.social;

import com.highschoolhowto.social.dto.AdminSocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkResponse;
import com.highschoolhowto.social.dto.SocialLinkUpdateRequest;
import com.highschoolhowto.web.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialLinkService {

    private final SocialLinkRepository repository;

    public SocialLinkService(SocialLinkRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SocialLinkResponse> listPublic() {
        return repository.findByEnabledTrueAndUrlIsNotNullOrderByDisplayOrderAsc()
                .stream().map(SocialLinkResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminSocialLinkResponse> listAdmin() {
        return repository.findAllByOrderByDisplayOrderAsc()
                .stream().map(AdminSocialLinkResponse::from).toList();
    }

    @Transactional
    public AdminSocialLinkResponse update(Long id, SocialLinkUpdateRequest request) {
        SocialLink link = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Social link not found", "Social link not found"));
        link.setUrl(request.url() == null || request.url().isBlank() ? null : request.url().trim());
        link.setEnabled(request.enabled());
        link.setDisplayOrder(request.displayOrder());
        return AdminSocialLinkResponse.from(repository.save(link));
    }
}
