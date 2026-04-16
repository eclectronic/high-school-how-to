--liquibase formatted sql

--changeset system:v5-about-mission-0063
UPDATE content_cards
SET
    body_html  = REPLACE(body_html, 'all in one convenient place', 'all in one place'),
    updated_at = now()
WHERE slug = 'about-mission';
--rollback UPDATE content_cards SET body_html = REPLACE(body_html, 'all in one place', 'all in one convenient place'), updated_at = now() WHERE slug = 'about-mission';
