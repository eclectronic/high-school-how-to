--liquibase formatted sql

--changeset codex:0001-auth-schema
-- Auth schema used by JPA entity com.highschoolhowto.user.User and related DTOs.

CREATE TABLE app_users (
  id UUID PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  grade_level VARCHAR(50),
  bio TEXT,
  interests TEXT,
  status VARCHAR(32) NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version BIGINT NOT NULL
);
ALTER TABLE app_users
  ADD CONSTRAINT uq_app_users_email UNIQUE (email);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE refresh_tokens
  ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens
  ADD CONSTRAINT uq_refresh_tokens_token UNIQUE (token);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE email_verification_tokens
  ADD CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  user_id UUID,
  email VARCHAR(320),
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE audit_events
  ADD CONSTRAINT fk_audit_events_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL;
CREATE INDEX idx_audit_events_type ON audit_events(event_type);

--rollback DROP TABLE audit_events;
--rollback DROP TABLE password_reset_tokens;
--rollback DROP TABLE email_verification_tokens;
--rollback DROP TABLE refresh_tokens;
--rollback DROP TABLE app_users;

--changeset codex:0002-task-lists
-- Task manager tables used by entities com.highschoolhowto.tasks.TaskList and TaskItem
-- and DTOs TaskListResponse/TaskItemResponse + CreateTask*Request/UpdateTaskRequest.
CREATE TABLE task_lists (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE task_lists
  ADD CONSTRAINT fk_task_lists_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
CREATE INDEX idx_task_lists_user ON task_lists(user_id);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  task_list_id UUID NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_task_list FOREIGN KEY (task_list_id) REFERENCES task_lists(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_task_list ON tasks(task_list_id);

--rollback DROP TABLE tasks;
--rollback DROP TABLE task_lists;
