--liquibase formatted sql

--changeset ron:0052-widget-free-form
ALTER TABLE locker_layout ADD COLUMN width INTEGER NULL;
ALTER TABLE locker_layout ADD COLUMN height INTEGER NULL;
--rollback ALTER TABLE locker_layout DROP COLUMN height;
--rollback ALTER TABLE locker_layout DROP COLUMN width;
