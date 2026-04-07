--liquibase formatted sql

--changeset codex:0027-widen-task-list-color
ALTER TABLE task_lists ALTER COLUMN color TYPE VARCHAR(255);
--rollback ALTER TABLE task_lists ALTER COLUMN color TYPE VARCHAR(32);

--changeset codex:0028-add-task-list-text-color
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS text_color VARCHAR(255);
--rollback ALTER TABLE task_lists DROP COLUMN IF EXISTS text_color;

--changeset codex:0029-add-task-due-at
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
--rollback ALTER TABLE tasks DROP COLUMN IF EXISTS due_at;

--changeset codex:0030-create-locker-layout
CREATE TABLE locker_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    card_type VARCHAR(32) NOT NULL,
    card_id UUID NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_locker_layout_card UNIQUE (user_id, card_type, card_id)
);
CREATE INDEX idx_locker_layout_user ON locker_layout (user_id, sort_order);
--rollback DROP TABLE locker_layout;
