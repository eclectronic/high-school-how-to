--liquibase formatted sql

--changeset ron:0070-v7-locker-prefs
ALTER TABLE user_app_preferences ADD COLUMN timer_color VARCHAR(16);
ALTER TABLE user_app_preferences ADD COLUMN locker_text_size VARCHAR(16) NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE timers ADD COLUMN IF NOT EXISTS preset_name VARCHAR(32);

--rollback ALTER TABLE timers DROP COLUMN IF EXISTS preset_name;
--rollback ALTER TABLE user_app_preferences DROP COLUMN locker_text_size;
--rollback ALTER TABLE user_app_preferences DROP COLUMN timer_color;
