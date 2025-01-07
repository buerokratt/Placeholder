WITH active_administrators AS (SELECT user_id
                               FROM user_authority
                               WHERE 'ROLE_ADMINISTRATOR' = ANY (authority_name)
                                 AND id IN (SELECT max(id)
                                            FROM user_authority
                                            GROUP BY user_id)),
delete_from_customer_support_activity AS (                                            
INSERT
INTO customer_support_agent_activity (id_code, active, created, status)
SELECT :userIdCode, 'false', :created::timestamp with time zone, 'offline'
WHERE (1 < (SELECT COUNT(user_id) FROM active_administrators)
    OR (1 = (SELECT COUNT(user_id) FROM active_administrators)
        AND :userIdCode NOT IN (SELECT user_id FROM active_administrators)))),
delete_user AS (
INSERT
INTO "user" (login, password_hash, first_name, last_name, id_code, display_name, status, created, csa_title, csa_email, department, jira_account_id)
SELECT login,
       password_hash,
       first_name,
       last_name,
       id_code,
       display_name,
       'deleted',
       :created::timestamp with time zone,
       csa_title,
       csa_email,
       department,
       jira_account_id
FROM "user"
WHERE id_code = :userIdCode
  AND status <> 'deleted'
  AND id IN (SELECT max(id) FROM "user" WHERE id_code = :userIdCode)
  AND (1 < (SELECT COUNT(user_id) FROM active_administrators)
    OR (1 = (SELECT COUNT(user_id) FROM active_administrators)
        AND :userIdCode NOT IN (SELECT user_id FROM active_administrators)))),
delete_authority AS (
INSERT
INTO user_authority (user_id, authority_name, created)
SELECT :userIdCode as users, ARRAY []::varchar[], :created::timestamp with time zone
FROM user_authority
WHERE 1 < (SELECT COUNT(user_id) FROM active_administrators)
   OR (1 = (SELECT COUNT(user_id) FROM active_administrators)
    AND :userIdCode NOT IN (SELECT user_id FROM active_administrators))
GROUP BY users),
delete_settings AS (
INSERT
INTO user_profile_settings (user_id, forwarded_chat_popup_notifications, forwarded_chat_sound_notifications, forwarded_chat_email_notifications, new_chat_popup_notifications, new_chat_sound_notifications, new_chat_email_notifications, use_autocorrect)
SELECT :userIdCode, false, false, false, false, false, false, false
WHERE 1 < (SELECT COUNT(user_id) FROM active_administrators)
   OR (1 = (SELECT COUNT(user_id) FROM active_administrators)
    AND :userIdCode NOT IN (SELECT user_id FROM active_administrators))
)
SELECT max(status) FROM "user" WHERE id_code = :userIdCode;
