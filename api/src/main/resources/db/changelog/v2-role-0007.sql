--liquibase formatted sql

--changeset system:0007-add-user-role
ALTER TABLE app_users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'USER';
--rollback ALTER TABLE app_users DROP COLUMN role;

--changeset system:0008-seed-admin-users
UPDATE app_users SET role = 'ADMIN' WHERE email IN ('ron@blert.com', 'mira@blert.com');
--rollback UPDATE app_users SET role = 'USER' WHERE email IN ('ron@blert.com', 'mira@blert.com');
