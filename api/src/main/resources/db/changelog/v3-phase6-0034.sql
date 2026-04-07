--liquibase formatted sql

--changeset ron:0034-content-card-simple-layout
ALTER TABLE content_cards ADD COLUMN simple_layout BOOLEAN NOT NULL DEFAULT FALSE;
--rollback ALTER TABLE content_cards DROP COLUMN simple_layout;
