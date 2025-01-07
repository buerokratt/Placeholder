-- liquibase formatted sql
-- changeset jannostern:20250102161913
ALTER TABLE "user" 
ADD COLUMN jira_account_id TEXT NOT NULL DEFAULT '';