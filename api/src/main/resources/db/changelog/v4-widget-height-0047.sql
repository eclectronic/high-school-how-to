--liquibase formatted sql

--changeset ron:0047
ALTER TABLE locker_layout ADD COLUMN min_height INTEGER DEFAULT NULL;

--rollback ALTER TABLE locker_layout DROP COLUMN min_height;
