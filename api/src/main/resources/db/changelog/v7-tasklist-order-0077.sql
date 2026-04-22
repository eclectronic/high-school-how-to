--liquibase formatted sql

--changeset ron:0077-v7-tasklist-order
ALTER TABLE task_lists ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

--rollback ALTER TABLE task_lists DROP COLUMN sort_order;
