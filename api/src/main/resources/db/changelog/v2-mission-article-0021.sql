--liquibase formatted sql

--changeset system:0021-seed-mission-article
INSERT INTO content_cards (slug, title, description, card_type, status, body_html, created_at, updated_at) VALUES (
    'my-mission',
    'My Mission',
    'HighSchoolHowTo is a busy student''s bulletin board, helping you stay stress-free by keeping things streamlined and convenient.',
    'ARTICLE',
    'PUBLISHED',
    '<p>You no longer have to open a million apps just to stay organized, because your Focus Board keeps every tool a student needs to stay organized all in one convenient place.</p><p>You can also find our infographics, animated videos, and guides that cover everything from academics to fun.</p><p>High school doesn''t have to be scary — we''re here to help! Sign up today to get started for free.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'my-mission' AND t.slug = 'daily-life';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'my-mission');
--rollback DELETE FROM content_cards WHERE slug = 'my-mission';
