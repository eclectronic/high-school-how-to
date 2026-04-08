--liquibase formatted sql

--changeset ron:0040-pinnable-locker-layout
ALTER TABLE locker_layout ADD COLUMN grid_col INT NOT NULL DEFAULT 1;
ALTER TABLE locker_layout ADD COLUMN col_span INT NOT NULL DEFAULT 4;
ALTER TABLE locker_layout ADD COLUMN item_order INT NOT NULL DEFAULT 0;
ALTER TABLE locker_layout ADD COLUMN minimized BOOLEAN NOT NULL DEFAULT false;

UPDATE locker_layout SET
    grid_col = CASE (sort_order % 3)
        WHEN 0 THEN 1
        WHEN 1 THEN 5
        ELSE 9
    END,
    col_span = 4,
    item_order = sort_order;

ALTER TABLE locker_layout DROP COLUMN sort_order;
--rollback ALTER TABLE locker_layout ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
--rollback UPDATE locker_layout SET sort_order = item_order;
--rollback ALTER TABLE locker_layout DROP COLUMN minimized;
--rollback ALTER TABLE locker_layout DROP COLUMN item_order;
--rollback ALTER TABLE locker_layout DROP COLUMN col_span;
--rollback ALTER TABLE locker_layout DROP COLUMN grid_col;
