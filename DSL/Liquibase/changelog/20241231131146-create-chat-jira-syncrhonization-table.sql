-- liquibase formatted sql
-- changeset jannostern:20241231131146

CREATE TABLE IF NOT EXISTS chat_jira_syncrhonization (
    id BIGSERIAL NOT NULL,
    chat_base_id VARCHAR(36) NOT NULL,
    status TEXT NOT NULL DEFAULT 'NONE',
    jira_status_code TEXT,
    jira_error_message TEXT,
    created TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_jira_syncrhonization_chat_base_id ON chat_jira_syncrhonization (chat_base_id);
CREATE INDEX IF NOT EXISTS idx_chat_jira_syncrhonization_status ON chat_jira_syncrhonization (status);
CREATE INDEX IF NOT EXISTS idx_chat_jira_syncrhonization_created ON chat_jira_syncrhonization (created);