package com.highschoolhowto.storage;

import com.highschoolhowto.security.UserPrincipal;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoint for authenticated users to upload custom icon images for use in
 * shortcuts and stickers. Icons are stored in S3 under
 * {@code media/icons/{userId}/} and enforced to a max of 100 per user.
 */
@RestController
@RequestMapping("/api/uploads")
public class UserIconUploadController {

    private final UserIconUploadService userIconUploadService;

    public UserIconUploadController(UserIconUploadService userIconUploadService) {
        this.userIconUploadService = userIconUploadService;
    }

    @PostMapping(value = "/icons", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IconUploadResponse> uploadIcon(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUser().getId();
        String iconUrl = userIconUploadService.uploadIcon(file, userId);
        return ResponseEntity.ok(new IconUploadResponse(iconUrl));
    }
}
