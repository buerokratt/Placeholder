INSERT INTO chat_jira_syncrhonization (chat_base_id, status, jira_status_code, jira_error_message)
VALUES (:chatBaseId, :status, :jiraStatusCode, :jiraErrorMessage) returning *;
