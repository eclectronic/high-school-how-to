--liquibase formatted sql

--changeset ron:0071-v7-app-colors
ALTER TABLE user_app_preferences ADD COLUMN app_colors TEXT;
UPDATE user_app_preferences SET app_colors = CONCAT('{"TIMER":"', timer_color, '"}') WHERE timer_color IS NOT NULL;
ALTER TABLE user_app_preferences DROP COLUMN timer_color;

--rollback ALTER TABLE user_app_preferences ADD COLUMN timer_color VARCHAR(16);
--rollback UPDATE user_app_preferences SET timer_color = app_colors::json->>'TIMER' WHERE app_colors IS NOT NULL AND app_colors::json->>'TIMER' IS NOT NULL;
--rollback ALTER TABLE user_app_preferences DROP COLUMN app_colors;
