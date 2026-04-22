--liquibase formatted sql

--changeset ron:0076-v7-grey-palette
-- Add light grey (#d1d5db) and moderate grey (#9ca3af) to the color palette.
INSERT INTO color_palette_entry (position, color) VALUES
    (23, '#d1d5db'),
    (24, '#9ca3af');

--rollback DELETE FROM color_palette_entry WHERE color IN ('#d1d5db', '#9ca3af');