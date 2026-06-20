--liquibase formatted sql

--changeset rlevasseur:v10-rename-help-shortcuts-0084
UPDATE content_cards SET slug = 'help-pins' WHERE slug = 'help-shortcuts';
--rollback UPDATE content_cards SET slug = 'help-shortcuts' WHERE slug = 'help-pins';
