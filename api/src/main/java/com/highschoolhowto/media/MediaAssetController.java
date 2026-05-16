package com.highschoolhowto.media;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin/media")
@PreAuthorize("hasRole('ADMIN')")
public class MediaAssetController {

    private final MediaAssetService service;

    public MediaAssetController(MediaAssetService service) {
        this.service = service;
    }

    @GetMapping
    public Page<MediaAssetResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "48") int size,
            @RequestParam(defaultValue = "false") boolean imagesOnly) {
        return service.list(search, imagesOnly, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "uploadedAt")));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MediaAssetResponse upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "images") String subfolder) {
        return service.upload(file, subfolder);
    }

    @PatchMapping("/{id}")
    public MediaAssetResponse patch(@PathVariable Long id, @RequestBody PatchMediaAssetRequest req) {
        return service.patch(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/{id}/usage")
    public MediaUsageResponse usage(@PathVariable Long id) {
        return service.usage(id);
    }
}
