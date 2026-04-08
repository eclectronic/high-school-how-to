--liquibase formatted sql

--changeset ron:0041-add-task-list-source-content-card-id
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS source_content_card_id BIGINT;
--rollback ALTER TABLE task_lists DROP COLUMN IF EXISTS source_content_card_id;
