--liquibase formatted sql

--changeset system:0024-add-featured-tag
INSERT INTO tags (slug, name, description, sort_order)
VALUES ('featured', 'Featured', 'Pinned to the top of the home page', 99)
ON CONFLICT (slug) DO NOTHING;
--rollback DELETE FROM tags WHERE slug = 'featured';

--changeset system:0025-drop-page-layout-sections
DROP TABLE page_layout_sections;
--rollback CREATE TABLE page_layout_sections ( id BIGSERIAL PRIMARY KEY, layout_id BIGINT NOT NULL, tag_id BIGINT NOT NULL, heading VARCHAR(500), sort_order INT NOT NULL DEFAULT 0, max_cards INT NOT NULL DEFAULT 6, UNIQUE (layout_id, tag_id) ); ALTER TABLE page_layout_sections ADD CONSTRAINT fk_pls_layout FOREIGN KEY (layout_id) REFERENCES page_layouts(id) ON DELETE CASCADE; ALTER TABLE page_layout_sections ADD CONSTRAINT fk_pls_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE; CREATE INDEX idx_page_layout_sections_layout ON page_layout_sections (layout_id, sort_order);

--changeset system:0026-drop-page-layouts
DROP TABLE page_layouts;
--rollback CREATE TABLE page_layouts ( id BIGSERIAL PRIMARY KEY, page_key VARCHAR(100) NOT NULL, featured_card_id BIGINT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by UUID ); ALTER TABLE page_layouts ADD CONSTRAINT uq_page_layouts_key UNIQUE (page_key); ALTER TABLE page_layouts ADD CONSTRAINT fk_page_layouts_card FOREIGN KEY (featured_card_id) REFERENCES content_cards(id) ON DELETE SET NULL; ALTER TABLE page_layouts ADD CONSTRAINT fk_page_layouts_user FOREIGN KEY (updated_by) REFERENCES app_users(id) ON DELETE SET NULL;
