--liquibase formatted sql

--changeset system:0078-media-urls-jsonb
ALTER TABLE content_cards ADD COLUMN media_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Back-fill: any row with a non-null media_url becomes a one-element array
UPDATE content_cards
SET media_urls = jsonb_build_array(
    jsonb_build_object(
        'url', media_url,
        'printUrl', print_media_url,
        'alt', NULL
    )
)
WHERE media_url IS NOT NULL;

--rollback ALTER TABLE content_cards DROP COLUMN media_urls;
