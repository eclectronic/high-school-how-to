CREATE TABLE content_card_links (
    id BIGSERIAL PRIMARY KEY,
    source_card_id BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    target_card_id BIGINT NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
    link_text VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_content_card_links UNIQUE (source_card_id, target_card_id),
    CONSTRAINT chk_no_self_link CHECK (source_card_id != target_card_id)
);
CREATE INDEX idx_content_card_links_source ON content_card_links(source_card_id);
CREATE INDEX idx_content_card_links_target ON content_card_links(target_card_id);
-- rollback DROP INDEX idx_content_card_links_target;
-- rollback DROP INDEX idx_content_card_links_source;
-- rollback DROP TABLE content_card_links;
