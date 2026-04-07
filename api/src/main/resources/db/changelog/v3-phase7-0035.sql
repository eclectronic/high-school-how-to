--liquibase formatted sql

--changeset ron:0035-create-stickers
CREATE TABLE stickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    type VARCHAR(16) NOT NULL DEFAULT 'EMOJI',
    emoji VARCHAR(16),
    image_url VARCHAR(2000),
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    size VARCHAR(16) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stickers_user ON stickers (user_id, created_at);
--rollback DROP TABLE stickers;
