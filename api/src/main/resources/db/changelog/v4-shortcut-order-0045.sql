--liquibase formatted sql

--changeset ron:0045-shortcut-sort-order
ALTER TABLE shortcuts ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

-- Assign sequential order within each user's shortcuts based on existing created_at order
UPDATE shortcuts s
SET sort_order = sub.rn - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
    FROM shortcuts
) sub
WHERE s.id = sub.id;

CREATE INDEX idx_shortcuts_user_order ON shortcuts(user_id, sort_order);
--rollback DROP INDEX idx_shortcuts_user_order;
--rollback ALTER TABLE shortcuts DROP COLUMN sort_order;
