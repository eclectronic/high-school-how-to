--liquibase formatted sql

--changeset ron:0048-timer-type-and-basic-duration
-- Adds a type discriminator to the timers table so we can distinguish
-- classic Pomodoro timers from plain countdown ("basic") timers, and
-- stores the basic timer's configured duration in seconds.
ALTER TABLE timers ADD COLUMN timer_type VARCHAR(16) NOT NULL DEFAULT 'POMODORO';
ALTER TABLE timers ADD COLUMN basic_duration_seconds INT NOT NULL DEFAULT 300;
--rollback ALTER TABLE timers DROP COLUMN basic_duration_seconds;
--rollback ALTER TABLE timers DROP COLUMN timer_type;
