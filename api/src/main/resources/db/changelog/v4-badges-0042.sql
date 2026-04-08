--liquibase formatted sql

--changeset ron:0042-create-badges
CREATE TABLE badges (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    emoji VARCHAR(10),
    icon_url VARCHAR(2000),
    trigger_type VARCHAR(50) NOT NULL,
    trigger_param VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_badge_trigger UNIQUE (trigger_type, trigger_param)
);
--rollback DROP TABLE badges;

--changeset ron:0043-create-earned-badges
CREATE TABLE earned_badges (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    badge_id BIGINT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_earned_badge UNIQUE (user_id, badge_id)
);
CREATE INDEX idx_earned_badges_user ON earned_badges(user_id);
--rollback DROP INDEX idx_earned_badges_user; DROP TABLE earned_badges;
