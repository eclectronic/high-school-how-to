--liquibase formatted sql

--changeset ron:0072-v7-recommended-shortcuts
CREATE TABLE recommended_shortcuts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    url         TEXT NOT NULL,
    emoji       VARCHAR(10),
    favicon_url VARCHAR(512),
    category    VARCHAR(100),
    sort_order  INT NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommended_shortcuts_active ON recommended_shortcuts (active, category, sort_order);

--rollback DROP TABLE recommended_shortcuts;
