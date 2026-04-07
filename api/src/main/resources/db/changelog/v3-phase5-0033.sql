--liquibase formatted sql

--changeset codex:0033-create-bookmark-lists
CREATE TABLE bookmark_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    color VARCHAR(255) NOT NULL DEFAULT '#fffef8',
    text_color VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookmark_lists_user ON bookmark_lists (user_id, created_at);
--rollback DROP TABLE bookmark_lists;

--changeset codex:0034-create-bookmarks
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bookmark_list_id UUID NOT NULL REFERENCES bookmark_lists(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    favicon_url VARCHAR(512),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookmarks_list ON bookmarks (bookmark_list_id, sort_order);
--rollback DROP TABLE bookmarks; DROP TABLE bookmark_lists;
