--liquibase formatted sql

--changeset ron:v5-font-family-0057
ALTER TABLE user_app_preferences
    ADD COLUMN font_family VARCHAR(50) DEFAULT NULL;

-- NULL means use the default system font.
-- Valid values: null (default), 'serif', 'mono', 'rounded'

--rollback ALTER TABLE user_app_preferences DROP COLUMN font_family;
