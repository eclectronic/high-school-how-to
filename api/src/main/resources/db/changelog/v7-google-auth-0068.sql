--liquibase formatted sql

--changeset ron:0068-v7-google-auth
ALTER TABLE app_users ADD COLUMN google_id VARCHAR(255);
ALTER TABLE app_users ADD COLUMN avatar_url VARCHAR(512);
ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX idx_app_users_google_id ON app_users(google_id) WHERE google_id IS NOT NULL;

--rollback DROP INDEX idx_app_users_google_id;
--rollback ALTER TABLE app_users ALTER COLUMN password_hash SET NOT NULL;
--rollback ALTER TABLE app_users DROP COLUMN avatar_url;
--rollback ALTER TABLE app_users DROP COLUMN google_id;
