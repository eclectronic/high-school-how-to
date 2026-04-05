--liquibase formatted sql

--changeset system:0009-content-tags
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    slug        VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE tags ADD CONSTRAINT uq_tags_slug UNIQUE (slug);
--rollback DROP TABLE tags;

--changeset system:0010-content-cards
CREATE TABLE content_cards (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(255)  NOT NULL,
    title           VARCHAR(500)  NOT NULL,
    description     TEXT,
    card_type       VARCHAR(50)   NOT NULL,
    media_url       VARCHAR(2000),
    print_media_url VARCHAR(2000),
    thumbnail_url   VARCHAR(2000),
    cover_image_url VARCHAR(2000),
    body_json       JSONB,
    body_html       TEXT,
    status          VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE content_cards ADD CONSTRAINT uq_content_cards_slug UNIQUE (slug);
CREATE INDEX idx_content_cards_status_type ON content_cards (status, card_type);
--rollback DROP TABLE content_cards;

--changeset system:0011-content-card-tags
CREATE TABLE content_card_tags (
    card_id    BIGINT NOT NULL,
    tag_id     BIGINT NOT NULL,
    sort_order INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (card_id, tag_id)
);
ALTER TABLE content_card_tags
    ADD CONSTRAINT fk_cct_card FOREIGN KEY (card_id) REFERENCES content_cards(id) ON DELETE CASCADE;
ALTER TABLE content_card_tags
    ADD CONSTRAINT fk_cct_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
CREATE INDEX idx_content_card_tags_tag ON content_card_tags (tag_id);
CREATE INDEX idx_content_card_tags_sort ON content_card_tags (tag_id, sort_order);
--rollback DROP TABLE content_card_tags;

--changeset system:0012-page-layouts
CREATE TABLE page_layouts (
    id               BIGSERIAL PRIMARY KEY,
    page_key         VARCHAR(100) NOT NULL,
    featured_card_id BIGINT,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by       UUID
);
ALTER TABLE page_layouts ADD CONSTRAINT uq_page_layouts_key UNIQUE (page_key);
ALTER TABLE page_layouts
    ADD CONSTRAINT fk_page_layouts_card FOREIGN KEY (featured_card_id) REFERENCES content_cards(id) ON DELETE SET NULL;
ALTER TABLE page_layouts
    ADD CONSTRAINT fk_page_layouts_user FOREIGN KEY (updated_by) REFERENCES app_users(id) ON DELETE SET NULL;

CREATE TABLE page_layout_sections (
    id         BIGSERIAL PRIMARY KEY,
    layout_id  BIGINT       NOT NULL,
    tag_id     BIGINT       NOT NULL,
    heading    VARCHAR(500),
    sort_order INT          NOT NULL DEFAULT 0,
    max_cards  INT          NOT NULL DEFAULT 6,
    UNIQUE (layout_id, tag_id)
);
ALTER TABLE page_layout_sections
    ADD CONSTRAINT fk_pls_layout FOREIGN KEY (layout_id) REFERENCES page_layouts(id) ON DELETE CASCADE;
ALTER TABLE page_layout_sections
    ADD CONSTRAINT fk_pls_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
CREATE INDEX idx_page_layout_sections_layout ON page_layout_sections (layout_id, sort_order);
--rollback DROP TABLE page_layout_sections;
--rollback DROP TABLE page_layouts;

--changeset system:0013-seed-home-layout
INSERT INTO page_layouts (page_key, updated_at) VALUES ('HOME', now());
--rollback DELETE FROM page_layouts WHERE page_key = 'HOME';
