--liquibase formatted sql

--changeset ron:0023
ALTER TABLE content_cards ADD COLUMN text_color VARCHAR(20);
--rollback ALTER TABLE content_cards DROP COLUMN text_color;
