--liquibase formatted sql

--changeset codex:0005-task-order
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Initialize existing rows with a stable order per list (by created_at).
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY task_list_id ORDER BY created_at, id) - 1 AS rn
  FROM tasks
)
UPDATE tasks t
SET sort_order = o.rn
FROM ordered o
WHERE t.id = o.id;

--rollback ALTER TABLE tasks DROP COLUMN IF EXISTS sort_order;
