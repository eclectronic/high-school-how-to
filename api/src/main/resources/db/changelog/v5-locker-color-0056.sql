--liquibase formatted sql

--changeset ron:v5-locker-color-0056
ALTER TABLE user_app_preferences
    ADD COLUMN locker_color VARCHAR(20) DEFAULT NULL;

-- locker_color: optional hex color string (e.g. '#f5ede0') for the locker workspace background.
-- NULL means use the frontend default color.

--rollback ALTER TABLE user_app_preferences DROP COLUMN locker_color;
