--liquibase formatted sql
--changeset app:create-database runInTransaction:false
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_database WHERE datname='highschoolhowto'
CREATE DATABASE highschoolhowto;
