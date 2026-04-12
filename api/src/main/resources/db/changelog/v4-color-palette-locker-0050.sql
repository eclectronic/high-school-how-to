--liquibase formatted sql

--changeset ron:0050-color-palette-locker-colors
INSERT INTO color_palette_entry (position, color) VALUES
    (16, '#3d8ed4'),
    (17, '#d42e2e'),
    (18, '#28a855'),
    (19, '#e07820'),
    (20, '#7048c0'),
    (21, '#1898a8'),
    (22, '#c8a810'),
    (23, '#6878a0');
--rollback DELETE FROM color_palette_entry WHERE position >= 16;
