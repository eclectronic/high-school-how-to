-- v4-shortcuts-0038.sql
CREATE TABLE shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    favicon_url VARCHAR(512),
    emoji VARCHAR(10),
    icon_url VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shortcuts_user ON shortcuts(user_id, created_at);

-- Migrate bookmarks → shortcuts
INSERT INTO shortcuts (user_id, url, name, favicon_url, created_at)
SELECT bl.user_id,
       b.url,
       CASE WHEN b.title = '' OR b.title IS NULL THEN b.url ELSE b.title END,
       b.favicon_url,
       b.created_at
FROM bookmarks b
JOIN bookmark_lists bl ON b.bookmark_list_id = bl.id
ORDER BY bl.created_at, b.sort_order;

DELETE FROM locker_layout WHERE card_type = 'BOOKMARK_LIST';
DROP TABLE bookmarks;
DROP TABLE bookmark_lists;

-- rollback: (destructive — take a backup before running)
