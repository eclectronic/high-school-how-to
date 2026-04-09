--liquibase formatted sql

--changeset ron:0036-create-content-card-tasks
CREATE TABLE content_card_tasks (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL
        REFERENCES content_cards(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--rollback DROP TABLE content_card_tasks;

--changeset ron:0036-idx-content-card-tasks-card-id
CREATE INDEX idx_content_card_tasks_card_id
    ON content_card_tasks(card_id);
--rollback DROP INDEX idx_content_card_tasks_card_id;

--changeset ron:0036-task-lists-source-content-card
ALTER TABLE task_lists
    ADD COLUMN source_content_card_id BIGINT;
--rollback ALTER TABLE task_lists DROP COLUMN source_content_card_id;
