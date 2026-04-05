package com.highschoolhowto.content.card;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Service;

@Service
public class HtmlSanitizerService {

    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements("p", "br", "b", "strong", "i", "em", "u", "s", "strike",
                    "h1", "h2", "h3", "h4", "h5", "h6",
                    "ul", "ol", "li", "blockquote", "pre", "code", "hr",
                    "img", "a", "figure", "figcaption", "div", "span")
            .allowAttributes("href").onElements("a")
            .allowAttributes("src", "alt", "width", "height", "loading").onElements("img")
            .allowAttributes("class", "style").globally()
            .allowAttributes("target", "rel").onElements("a")
            .allowStandardUrlProtocols()
            .requireRelNofollowOnLinks()
            .toFactory();

    /**
     * Sanitizes HTML produced by the Tiptap editor, stripping any tags or
     * attributes not in the allowlist to prevent XSS.
     */
    public String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }
        return POLICY.sanitize(html);
    }
}
