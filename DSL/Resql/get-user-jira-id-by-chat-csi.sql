SELECT
    jira_account_id
FROM
    "user" AS u
WHERE
    u.id_code = :chatCustomerSupportId
AND id IN (SELECT MAX(id) FROM "user" GROUP BY id_code)
