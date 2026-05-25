--liquibase formatted sql

--changeset system:0082-social-links
CREATE TABLE social_links (
    id             BIGSERIAL PRIMARY KEY,
    platform       VARCHAR(50)   NOT NULL UNIQUE,
    display_name   VARCHAR(100)  NOT NULL,
    url            VARCHAR(2000),
    display_order  INT           NOT NULL DEFAULT 0,
    enabled        BOOLEAN       NOT NULL DEFAULT TRUE
);

INSERT INTO social_links (platform, display_name, url, display_order, enabled)
VALUES
    ('INSTAGRAM', 'Instagram', 'https://www.instagram.com/highschoolhowto', 1, TRUE),
    ('YOUTUBE',   'YouTube',   'https://www.youtube.com/@HighSchool-HowTo', 2, TRUE),
    ('TIKTOK',    'TikTok',    NULL,                                         3, TRUE);

--rollback DELETE FROM social_links WHERE platform IN ('INSTAGRAM', 'YOUTUBE', 'TIKTOK');
--rollback DROP TABLE social_links;
