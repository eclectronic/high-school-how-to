--liquibase formatted sql
--changeset system:v5-help-show-nav-0066
-- Help articles were originally seeded with simple_layout=TRUE, which hides the
-- viewer-nav (logo + back link) and the prev/next arrows. Help readers need a
-- way to get back to /help, so flip the flag for every card tagged 'help'.
UPDATE content_cards
SET
    simple_layout = FALSE,
    updated_at    = now()
WHERE id IN (
    SELECT cct.card_id
    FROM content_card_tags cct
    JOIN tags t ON t.id = cct.tag_id
    WHERE t.slug = 'help'
);
--rollback UPDATE content_cards SET simple_layout = TRUE, updated_at = now() WHERE id IN (SELECT cct.card_id FROM content_card_tags cct JOIN tags t ON t.id = cct.tag_id WHERE t.slug = 'help');
