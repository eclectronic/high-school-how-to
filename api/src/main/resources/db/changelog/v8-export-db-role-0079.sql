--liquibase formatted sql

--changeset system:0079-export-db-role runAlways:true splitStatements:false
-- No-op when EXPORT_DB_PASSWORD is not configured (non-prod environments).
DO $$
BEGIN
  IF '${EXPORT_DB_PASSWORD}' = '' THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hshowto_export') THEN
    EXECUTE format('CREATE ROLE hshowto_export LOGIN PASSWORD %L', '${EXPORT_DB_PASSWORD}');
  ELSE
    EXECUTE format('ALTER ROLE hshowto_export PASSWORD %L', '${EXPORT_DB_PASSWORD}');
  END IF;
  EXECUTE 'GRANT CONNECT ON DATABASE ' || quote_ident(current_database()) || ' TO hshowto_export';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO hshowto_export';
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO hshowto_export';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO hshowto_export';
END
$$;
--rollback DROP ROLE IF EXISTS hshowto_export;
