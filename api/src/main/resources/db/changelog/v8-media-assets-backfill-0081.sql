--liquibase formatted sql

-- Seed media_assets from all URL fields already stored on content cards.
-- ON CONFLICT DO NOTHING makes this idempotent.

--changeset system:0081-media-assets-backfill
INSERT INTO media_assets (url, filename)
SELECT DISTINCT url, regexp_replace(url, '^.*/', '') AS filename
FROM (
    SELECT thumbnail_url AS url   FROM content_cards WHERE thumbnail_url   IS NOT NULL AND thumbnail_url   <> ''
    UNION
    SELECT cover_image_url        FROM content_cards WHERE cover_image_url  IS NOT NULL AND cover_image_url  <> ''
    UNION
    SELECT media_url              FROM content_cards WHERE media_url         IS NOT NULL AND media_url         <> ''
    UNION
    SELECT print_media_url        FROM content_cards WHERE print_media_url   IS NOT NULL AND print_media_url   <> ''
    UNION
    SELECT entry->>'url'          FROM content_cards, jsonb_array_elements(media_urls) AS entry
                                  WHERE entry->>'url' IS NOT NULL AND entry->>'url' <> ''
    UNION
    SELECT entry->>'printUrl'     FROM content_cards, jsonb_array_elements(media_urls) AS entry
                                  WHERE entry->>'printUrl' IS NOT NULL AND entry->>'printUrl' <> ''
    UNION
    -- img src values embedded in rich-text article bodies
    SELECT (regexp_matches(body_html, '<img[^>]+src="([^"]+)"', 'g'))[1]
    FROM content_cards WHERE body_html IS NOT NULL AND body_html <> ''
) AS urls(url)
ON CONFLICT (url) DO NOTHING;

--rollback DELETE FROM media_assets;
