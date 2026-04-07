--liquibase formatted sql

--changeset codex:0031-create-timers
CREATE TABLE timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    color VARCHAR(255) NOT NULL DEFAULT '#fffef8',
    text_color VARCHAR(255),
    focus_duration INT NOT NULL DEFAULT 25,
    short_break_duration INT NOT NULL DEFAULT 5,
    long_break_duration INT NOT NULL DEFAULT 15,
    sessions_before_long_break INT NOT NULL DEFAULT 4,
    preset_name VARCHAR(64),
    linked_task_list_id UUID REFERENCES task_lists(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_timers_user ON timers (user_id, created_at);
--rollback DROP TABLE timers;
