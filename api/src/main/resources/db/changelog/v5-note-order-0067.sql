--liquibase formatted sql

--changeset ron:0067-note-sort-order
ALTER TABLE notes ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

-- Assign sequential order within each user's notes based on existing created_at order
-- (newest first, matching the previous default list ordering).
UPDATE notes n
SET sort_order = sub.rn - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM notes
) sub
WHERE n.id = sub.id;

CREATE INDEX idx_notes_user_order ON notes(user_id, sort_order);
--rollback DROP INDEX idx_notes_user_order;
--rollback ALTER TABLE notes DROP COLUMN sort_order;
