package com.highschoolhowto.content.layout;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pages")
public class PageLayoutController {

    private final PageLayoutService layoutService;

    public PageLayoutController(PageLayoutService layoutService) {
        this.layoutService = layoutService;
    }

    @GetMapping("/home/layout")
    public HomeLayoutResponse getHomeLayout() {
        return layoutService.getHomeLayout();
    }
}
