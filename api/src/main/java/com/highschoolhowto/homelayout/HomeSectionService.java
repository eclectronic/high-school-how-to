package com.highschoolhowto.homelayout;

import com.highschoolhowto.homelayout.dto.HomeSectionRequest;
import com.highschoolhowto.homelayout.dto.HomeSectionResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HomeSectionService {

    private final HomeSectionRepository repo;

    public HomeSectionService(HomeSectionRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<HomeSectionResponse> list() {
        return repo.findAllByOrderBySortOrderAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public List<HomeSectionResponse> save(List<HomeSectionRequest> requests) {
        repo.deleteAll();
        List<HomeSection> sections = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            HomeSectionRequest req = requests.get(i);
            HomeSection s = new HomeSection();
            s.setSortOrder(i + 1);
            s.setLayout(req.layout());
            s.setSlot1Tag(req.slot1Tag());
            s.setSlot2Tag(req.slot2Tag());
            sections.add(s);
        }
        return repo.saveAll(sections).stream().map(this::toResponse).toList();
    }

    private HomeSectionResponse toResponse(HomeSection s) {
        return new HomeSectionResponse(s.getId(), s.getSortOrder(), s.getLayout(), s.getSlot1Tag(), s.getSlot2Tag());
    }
}
