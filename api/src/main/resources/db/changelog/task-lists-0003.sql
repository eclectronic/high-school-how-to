--liquibase formatted sql

--changeset codex:0003-task-lists
-- Create task_lists table (idempotent).
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_task_lists_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_lists_user ON task_lists(user_id);
--rollback DROP TABLE IF EXISTS task_lists;

--changeset codex:0004-tasks
-- Create tasks table (idempotent).
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  task_list_id UUID NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_tasks_task_list FOREIGN KEY (task_list_id) REFERENCES task_lists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_task_list ON tasks(task_list_id);
--rollback DROP TABLE IF EXISTS tasks;
