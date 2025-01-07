-- liquibase formatted sql
-- changeset jannostern:20250103092714
ALTER TABLE "user" 
ADD COLUMN department TEXT DEFAULT '';