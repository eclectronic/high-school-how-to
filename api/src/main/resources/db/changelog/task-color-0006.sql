--liquibase formatted sql

--changeset codex:0006-task-list-color
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS color VARCHAR(32);

UPDATE task_lists SET color = '#fffef8' WHERE color IS NULL;

ALTER TABLE task_lists ALTER COLUMN color SET NOT NULL;

--rollback ALTER TABLE task_lists DROP COLUMN IF EXISTS color;
