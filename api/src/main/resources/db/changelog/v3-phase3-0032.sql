--liquibase formatted sql

--changeset codex:0032-create-notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    content TEXT,
    color VARCHAR(255) NOT NULL DEFAULT '#fef3c7',
    text_color VARCHAR(255),
    font_size VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_user ON notes (user_id, created_at);
--rollback DROP TABLE notes;
