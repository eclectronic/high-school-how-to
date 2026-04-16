--liquibase formatted sql

-- Seed fixed background colors for help post-it cards so they are stable across page loads.
-- Colors chosen from the standard post-it palette used by the help page component.
--changeset system:v5-help-colors-0064
UPDATE content_cards SET background_color = '#fff176', updated_at = now() WHERE slug = 'help-welcome';
UPDATE content_cards SET background_color = '#ffcc80', updated_at = now() WHERE slug = 'help-apps';
UPDATE content_cards SET background_color = '#f48fb1', updated_at = now() WHERE slug = 'help-todo';
UPDATE content_cards SET background_color = '#ce93d8', updated_at = now() WHERE slug = 'help-notes';
UPDATE content_cards SET background_color = '#80deea', updated_at = now() WHERE slug = 'help-timer';
UPDATE content_cards SET background_color = '#a5d6a7', updated_at = now() WHERE slug = 'help-shortcuts';
UPDATE content_cards SET background_color = '#90caf9', updated_at = now() WHERE slug = 'help-edit-mode';
UPDATE content_cards SET background_color = '#ffab91', updated_at = now() WHERE slug = 'help-stickers';
UPDATE content_cards SET background_color = '#b0bec5', updated_at = now() WHERE slug = 'help-palettes';
UPDATE content_cards SET background_color = '#fff59d', updated_at = now() WHERE slug = 'help-mobile';
UPDATE content_cards SET background_color = '#fff176', updated_at = now() WHERE slug = 'help-content-import';
UPDATE content_cards SET background_color = '#ffcc80', updated_at = now() WHERE slug = 'help-keyboard';
UPDATE content_cards SET background_color = '#f48fb1', updated_at = now() WHERE slug = 'help-support';
UPDATE content_cards SET background_color = '#ce93d8', updated_at = now() WHERE slug = 'help-signup';
--rollback UPDATE content_cards SET background_color = NULL, updated_at = now() WHERE slug IN ('help-welcome','help-apps','help-todo','help-notes','help-timer','help-shortcuts','help-edit-mode','help-stickers','help-palettes','help-mobile','help-content-import','help-keyboard','help-support','help-signup');
