--liquibase formatted sql

--changeset ron:0039-alter-stickers-v4
-- Migrate stickers table from v3 schema (type/imageUrl/positionX/positionY/size)
-- to v4 schema (emoji/iconUrl/label with icon constraint).
ALTER TABLE stickers DROP COLUMN IF EXISTS type;
ALTER TABLE stickers DROP COLUMN IF EXISTS image_url;
ALTER TABLE stickers DROP COLUMN IF EXISTS position_x;
ALTER TABLE stickers DROP COLUMN IF EXISTS position_y;
ALTER TABLE stickers DROP COLUMN IF EXISTS size;
ALTER TABLE stickers ALTER COLUMN emoji TYPE VARCHAR(10);
ALTER TABLE stickers ADD COLUMN IF NOT EXISTS icon_url VARCHAR(2000);
ALTER TABLE stickers ADD COLUMN IF NOT EXISTS label VARCHAR(255);
ALTER TABLE stickers ADD CONSTRAINT chk_sticker_icon
    CHECK (
        (emoji IS NOT NULL AND icon_url IS NULL)
        OR (emoji IS NULL AND icon_url IS NOT NULL)
    );
DROP INDEX IF EXISTS idx_stickers_user;
CREATE INDEX idx_stickers_user ON stickers(user_id);
-- rollback DROP INDEX idx_stickers_user;
-- rollback CREATE INDEX idx_stickers_user ON stickers (user_id, created_at);
-- rollback ALTER TABLE stickers DROP CONSTRAINT IF EXISTS chk_sticker_icon;
-- rollback ALTER TABLE stickers DROP COLUMN IF EXISTS label;
-- rollback ALTER TABLE stickers DROP COLUMN IF EXISTS icon_url;
-- rollback ALTER TABLE stickers ALTER COLUMN emoji TYPE VARCHAR(16);
-- rollback ALTER TABLE stickers ADD COLUMN size VARCHAR(16) NOT NULL DEFAULT 'medium';
-- rollback ALTER TABLE stickers ADD COLUMN position_y DOUBLE PRECISION NOT NULL DEFAULT 0;
-- rollback ALTER TABLE stickers ADD COLUMN position_x DOUBLE PRECISION NOT NULL DEFAULT 0;
-- rollback ALTER TABLE stickers ADD COLUMN image_url VARCHAR(2000);
-- rollback ALTER TABLE stickers ADD COLUMN type VARCHAR(16) NOT NULL DEFAULT 'EMOJI';
