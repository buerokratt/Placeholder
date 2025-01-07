INSERT INTO "user" (id_code, login, password_hash, first_name, last_name, display_name, status, created, csa_title, csa_email, department, jira_account_id)
SELECT
  :userIdCode,
  login,
  password_hash,
  :firstName,
  :lastName,
  :displayName,
  :status::user_status,
  :created::timestamp with time zone,
  :csaTitle,
  :csaEmail,
  :department,
  :jiraAccountId
FROM "user"
WHERE id = (
  SELECT MAX(id) FROM "user" WHERE id_code = :userIdCode
);
