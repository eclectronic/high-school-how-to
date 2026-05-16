--liquibase formatted sql

--changeset system:0080-media-assets
CREATE TABLE media_assets (
    id            BIGSERIAL PRIMARY KEY,
    url           VARCHAR(2000) NOT NULL,
    filename      VARCHAR(512),
    alt_text      VARCHAR(1000),
    mime_type     VARCHAR(100),
    size_bytes    BIGINT,
    width         INT,
    height        INT,
    uploaded_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    uploaded_by_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    CONSTRAINT uq_media_assets_url UNIQUE (url)
);

CREATE INDEX idx_media_assets_filename ON media_assets (lower(filename));
CREATE INDEX idx_media_assets_alt_text ON media_assets (lower(alt_text));
CREATE INDEX idx_media_assets_uploaded_at ON media_assets (uploaded_at DESC);

--rollback DROP TABLE media_assets;
