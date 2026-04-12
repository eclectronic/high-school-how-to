--liquibase formatted sql

--changeset ron:0049-create-color-palette
CREATE TABLE color_palette_entry (
    id BIGSERIAL PRIMARY KEY,
    position SMALLINT NOT NULL,
    color VARCHAR(200) NOT NULL,
    CONSTRAINT uq_color_palette_position UNIQUE (position)
);

INSERT INTO color_palette_entry (position, color) VALUES
    (0,  '#fffef8'),
    (1,  '#fef3c7'),
    (2,  '#fde68a'),
    (3,  '#fcd34d'),
    (4,  '#fef2f2'),
    (5,  '#fecdd3'),
    (6,  '#fda4af'),
    (7,  '#fbcfe8'),
    (8,  '#ede9fe'),
    (9,  '#ddd6fe'),
    (10, '#c7d2fe'),
    (11, '#bfdbfe'),
    (12, '#dcfce7'),
    (13, '#bbf7d0'),
    (14, '#a7f3d0'),
    (15, '#e0f2fe');
--rollback DELETE FROM color_palette_entry; DROP TABLE color_palette_entry;
