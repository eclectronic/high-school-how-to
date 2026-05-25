--liquibase formatted sql
--changeset system:0083-home-layout

CREATE TABLE home_sections (
    id            BIGSERIAL PRIMARY KEY,
    sort_order    INT          NOT NULL DEFAULT 0,
    layout        VARCHAR(10)  NOT NULL DEFAULT 'full',
    slot1_tag     VARCHAR(100) NOT NULL,
    slot2_tag     VARCHAR(100)
);

INSERT INTO home_sections (sort_order, layout, slot1_tag, slot2_tag) VALUES
    (1, 'split', 'home-how-to', 'home-locker'),
    (2, 'full',  'home-video',  NULL);

--rollback DELETE FROM home_sections;
--rollback DROP TABLE home_sections;
