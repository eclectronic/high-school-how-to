--liquibase formatted sql

--changeset ron:0051-color-palette-reorder
-- Locker colors first, pastels second, white removed.
DELETE FROM color_palette_entry;

INSERT INTO color_palette_entry (position, color) VALUES
    -- Locker colors
    (0,  '#3d8ed4'),
    (1,  '#d42e2e'),
    (2,  '#28a855'),
    (3,  '#e07820'),
    (4,  '#7048c0'),
    (5,  '#1898a8'),
    (6,  '#c8a810'),
    (7,  '#6878a0'),
    -- Pastels (white removed)
    (8,  '#fef3c7'),
    (9,  '#fde68a'),
    (10, '#fcd34d'),
    (11, '#fef2f2'),
    (12, '#fecdd3'),
    (13, '#fda4af'),
    (14, '#fbcfe8'),
    (15, '#ede9fe'),
    (16, '#ddd6fe'),
    (17, '#c7d2fe'),
    (18, '#bfdbfe'),
    (19, '#dcfce7'),
    (20, '#bbf7d0'),
    (21, '#a7f3d0'),
    (22, '#e0f2fe');
--rollback -- Data-only reorder; no structural rollback needed.
