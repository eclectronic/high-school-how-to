--liquibase formatted sql

--changeset system:0019-ensure-admin-roles runOnChange:true
-- 0008 only updated existing rows. This changeset ensures the admin emails
-- get ADMIN role regardless of when the accounts were created.
UPDATE app_users SET role = 'ADMIN' WHERE email IN ('ron@blert.com', 'mai@blert.com', 'mira@blert.com') AND role != 'ADMIN';
--rollback UPDATE app_users SET role = 'USER' WHERE email IN ('ron@blert.com', 'mira@blert.com');
