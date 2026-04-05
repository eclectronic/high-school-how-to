--liquibase formatted sql

--changeset system:0014-seed-initial-tags
INSERT INTO tags (slug, name, description, sort_order) VALUES
    ('academics',        'Academics',        'GPA, studying, annotations, and school skills',   0),
    ('tests-for-college','Tests for College','SAT, ACT, and college entrance test prep',        1),
    ('style-self',       'Style & Self',     'Fashion, hair, music, and personal expression',   2),
    ('daily-life',       'Daily Life',       'Routines, wellness, and everyday how-tos',        3);
--rollback DELETE FROM tags WHERE slug IN ('academics', 'tests-for-college', 'style-self', 'daily-life');

--changeset system:0015-seed-video-cards
INSERT INTO content_cards (slug, title, description, card_type, media_url, thumbnail_url, status, created_at, updated_at) VALUES
    (
        'ultimate-gpa-calculation-guide',
        'The ULTIMATE GPA Calculation Guide',
        'How to find your weighted, unweighted, and capped GPA and why it matters.',
        'VIDEO',
        'https://www.youtube.com/watch?v=fcECDsCmxD0',
        'https://img.youtube.com/vi/fcECDsCmxD0/hqdefault.jpg',
        'PUBLISHED',
        now(), now()
    ),
    (
        'sat-vs-act-guide',
        'To Test or Not to Test? The SAT, the ACT, and YOU!',
        'What is the SAT? What is the ACT? What''s the difference? Your comprehensive guide to college standardized testing.',
        'VIDEO',
        'https://www.youtube.com/watch?v=V5amSLLPFoA',
        'https://img.youtube.com/vi/V5amSLLPFoA/hqdefault.jpg',
        'PUBLISHED',
        now(), now()
    );
--rollback DELETE FROM content_cards WHERE slug IN ('ultimate-gpa-calculation-guide', 'sat-vs-act-guide');

--changeset system:0016-seed-infographic-cards
-- Note: media_url and print_media_url use the frontend public asset paths.
-- These will resolve correctly once deployed (served from the same origin).
-- To move assets to S3, update these URLs after uploading via the admin image uploader.
INSERT INTO content_cards (slug, title, description, card_type, media_url, print_media_url, status, created_at, updated_at) VALUES
    (
        'five-tips-hair-dye',
        'Five Tips Before You Dye Your Hair',
        'Prep, patch test, and care steps before trying that new color.',
        'INFOGRAPHIC',
        '/assets/infographics/web/five-tips-for-hair-dye.jpeg',
        '/assets/infographics/printable/five-tips-for-hair-dye.jpeg',
        'PUBLISHED',
        now(), now()
    ),
    (
        'discover-new-music',
        'How to Discover New Music',
        'Quick cheatsheet for finding playlists, radio shows, and concerts.',
        'INFOGRAPHIC',
        '/assets/infographics/web/how-to-discover-music.jpeg',
        '/assets/infographics/printable/how-to-discover-music.jpeg',
        'PUBLISHED',
        now(), now()
    ),
    (
        'daily-routine',
        'Daily Routine',
        'My ideal daily routine for productivity and well-being.',
        'INFOGRAPHIC',
        '/assets/infographics/web/daily-routine.png',
        '/assets/infographics/printable/daily-routine.png',
        'PUBLISHED',
        now(), now()
    ),
    (
        'un-boring-your-annotations',
        'Un-Boring Your Annotations',
        'Tips for making annotations that stick out and help you learn.',
        'INFOGRAPHIC',
        '/assets/infographics/web/un-boring-your-annotations.jpeg',
        '/assets/infographics/printable/un-boring-your-annotations.jpeg',
        'PUBLISHED',
        now(), now()
    );
--rollback DELETE FROM content_cards WHERE slug IN ('five-tips-hair-dye', 'discover-new-music', 'daily-routine', 'un-boring-your-annotations');

--changeset system:0017-seed-card-tags
-- GPA video → Academics
INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'ultimate-gpa-calculation-guide' AND t.slug = 'academics';

-- SAT/ACT video → Tests for College + Academics
INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'sat-vs-act-guide' AND t.slug = 'tests-for-college';

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 1
FROM content_cards c, tags t
WHERE c.slug = 'sat-vs-act-guide' AND t.slug = 'academics';

-- Hair dye infographic → Style & Self
INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'five-tips-hair-dye' AND t.slug = 'style-self';

-- Music infographic → Style & Self
INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 1
FROM content_cards c, tags t
WHERE c.slug = 'discover-new-music' AND t.slug = 'style-self';

-- Daily routine → Daily Life
INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'daily-routine' AND t.slug = 'daily-life';

-- Annotations → Academics
INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 1
FROM content_cards c, tags t
WHERE c.slug = 'un-boring-your-annotations' AND t.slug = 'academics';
--rollback DELETE FROM content_card_tags WHERE card_id IN (SELECT id FROM content_cards WHERE slug IN ('ultimate-gpa-calculation-guide', 'sat-vs-act-guide', 'five-tips-hair-dye', 'discover-new-music', 'daily-routine', 'un-boring-your-annotations'));

--changeset system:0018-seed-homepage-layout
-- Set the GPA video as the initial featured card
UPDATE page_layouts
SET featured_card_id = (SELECT id FROM content_cards WHERE slug = 'ultimate-gpa-calculation-guide'),
    updated_at = now()
WHERE page_key = 'HOME';

-- Add homepage sections: Academics, Tests for College, Style & Self, Daily Life
INSERT INTO page_layout_sections (layout_id, tag_id, heading, sort_order, max_cards)
SELECT pl.id, t.id, NULL, 0, 6
FROM page_layouts pl, tags t
WHERE pl.page_key = 'HOME' AND t.slug = 'academics';

INSERT INTO page_layout_sections (layout_id, tag_id, heading, sort_order, max_cards)
SELECT pl.id, t.id, NULL, 1, 6
FROM page_layouts pl, tags t
WHERE pl.page_key = 'HOME' AND t.slug = 'tests-for-college';

INSERT INTO page_layout_sections (layout_id, tag_id, heading, sort_order, max_cards)
SELECT pl.id, t.id, NULL, 2, 6
FROM page_layouts pl, tags t
WHERE pl.page_key = 'HOME' AND t.slug = 'style-self';

INSERT INTO page_layout_sections (layout_id, tag_id, heading, sort_order, max_cards)
SELECT pl.id, t.id, NULL, 3, 6
FROM page_layouts pl, tags t
WHERE pl.page_key = 'HOME' AND t.slug = 'daily-life';
--rollback DELETE FROM page_layout_sections WHERE layout_id = (SELECT id FROM page_layouts WHERE page_key = 'HOME');
--rollback UPDATE page_layouts SET featured_card_id = NULL WHERE page_key = 'HOME';
