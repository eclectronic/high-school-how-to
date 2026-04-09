-- Quote library table
CREATE TABLE quotes (
    id BIGSERIAL PRIMARY KEY,
    quote_text TEXT NOT NULL,
    attribution VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note type column
ALTER TABLE notes ADD COLUMN note_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR';

-- rollback ALTER TABLE notes DROP COLUMN note_type;
-- rollback DROP TABLE quotes;
