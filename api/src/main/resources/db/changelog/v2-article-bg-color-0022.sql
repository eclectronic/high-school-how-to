--liquibase formatted sql

--changeset system:0022-article-background-color
ALTER TABLE content_cards ADD COLUMN background_color VARCHAR(20);
--rollback ALTER TABLE content_cards DROP COLUMN background_color;
