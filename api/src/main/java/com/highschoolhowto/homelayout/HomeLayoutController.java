package com.highschoolhowto.homelayout;

import com.highschoolhowto.homelayout.dto.HomeSectionRequest;
import com.highschoolhowto.homelayout.dto.HomeSectionResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeLayoutController {

    private final HomeSectionService service;

    public HomeLayoutController(HomeSectionService service) {
        this.service = service;
    }

    @GetMapping("/api/home-layout")
    public List<HomeSectionResponse> getPublic() {
        return service.list();
    }

    @GetMapping("/api/admin/home-layout")
    @PreAuthorize("hasRole('ADMIN')")
    public List<HomeSectionResponse> getAdmin() {
        return service.list();
    }

    @PutMapping("/api/admin/home-layout")
    @PreAuthorize("hasRole('ADMIN')")
    public List<HomeSectionResponse> save(@RequestBody List<HomeSectionRequest> sections) {
        return service.save(sections);
    }
}
