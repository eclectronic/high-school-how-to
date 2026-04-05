--liquibase formatted sql

--changeset system:0020-update-media-urls
-- Migrate infographic URLs from frontend static assets path to the mounted /media volume path.
-- In production, these should be updated again to absolute S3/CDN URLs via the admin editor.
UPDATE content_cards SET
    media_url       = REPLACE(media_url,       '/assets/infographics/', '/media/infographics/'),
    print_media_url = REPLACE(print_media_url, '/assets/infographics/', '/media/infographics/'),
    thumbnail_url   = REPLACE(thumbnail_url,   '/assets/infographics/', '/media/infographics/')
WHERE card_type = 'INFOGRAPHIC';
--rollback UPDATE content_cards SET media_url = REPLACE(media_url, '/media/infographics/', '/assets/infographics/'), print_media_url = REPLACE(print_media_url, '/media/infographics/', '/assets/infographics/'), thumbnail_url = REPLACE(thumbnail_url, '/media/infographics/', '/assets/infographics/') WHERE card_type = 'INFOGRAPHIC';
