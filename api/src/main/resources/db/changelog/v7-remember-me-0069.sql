--liquibase formatted sql

--changeset ron:0069-v7-remember-me
ALTER TABLE refresh_tokens ADD COLUMN remember_me BOOLEAN NOT NULL DEFAULT TRUE;

--rollback ALTER TABLE refresh_tokens DROP COLUMN remember_me;
