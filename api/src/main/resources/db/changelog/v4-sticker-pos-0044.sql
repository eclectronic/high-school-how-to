--liquibase formatted sql

--changeset ron:0044-sticker-free-position
ALTER TABLE locker_layout ADD COLUMN pos_x INT NULL;
ALTER TABLE locker_layout ADD COLUMN pos_y INT NULL;
--rollback ALTER TABLE locker_layout DROP COLUMN pos_y;
--rollback ALTER TABLE locker_layout DROP COLUMN pos_x;
