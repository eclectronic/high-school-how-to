--liquibase formatted sql

--changeset ron:v5-app-preferences-0053
CREATE TABLE user_app_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
    active_apps TEXT NOT NULL DEFAULT '["TODO","NOTES","TIMER"]',
    pane_order TEXT DEFAULT NULL,
    palette_name VARCHAR(50) NOT NULL DEFAULT 'ocean',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- active_apps: JSON array of app identifiers, e.g. ["TODO","NOTES","TIMER"]
-- pane_order: JSON array defining custom pane order, null = use smart defaults
-- palette_name: name of the selected color palette

--rollback DROP TABLE IF EXISTS user_app_preferences;
