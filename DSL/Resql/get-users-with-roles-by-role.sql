SELECT u.login,
       u.first_name,
       u.last_name,
       u.id_code,
       u.display_name,
       u.csa_title,
       u.csa_email,
       u.department,
       u.jira_account_id,
       ua.authority_name AS authorities,
       csa.status AS customer_support_status,
       CEIL(COUNT(*) OVER() / :page_size::DECIMAL) AS total_pages
FROM "user" u
LEFT JOIN (
    SELECT authority_name, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn
    FROM user_authority AS ua
    WHERE authority_name && ARRAY [ :roles ]::character varying array
      AND ua.id IN (
          SELECT max(id)
          FROM user_authority
          GROUP BY user_id
      )
) ua ON u.id_code = ua.user_id
JOIN (
    SELECT id_code, status, ROW_NUMBER() OVER (PARTITION BY id_code ORDER BY id DESC) AS rn
    FROM customer_support_agent_activity
) csa ON u.id_code = csa.id_code AND csa.rn = 1
WHERE u.status <> 'deleted'
  AND array_length(authority_name, 1) > 0
  AND u.id IN (
      SELECT max(id)
      FROM "user"
      GROUP BY id_code
  )
  AND (
      :search_display_name_and_csa_title IS NULL 
      OR LOWER(u.display_name) LIKE LOWER('%' || :search_display_name_and_csa_title || '%')
      OR LOWER(u.csa_title) LIKE LOWER('%' || :search_display_name_and_csa_title || '%')
  )
  AND (
    :search_full_name_and_csa_title IS NULL
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER('%' || :search_full_name_and_csa_title || '%')
        OR LOWER(u.csa_title) LIKE LOWER('%' || :search_full_name_and_csa_title || '%')
    )
  AND (:show_active_only <> true OR csa.status <> 'offline')
  AND (:search_full_name IS NULL OR (
      (u.first_name || ' ' || u.last_name) ILIKE '%' || :search_full_name || '%'
  ))
  AND (:search_id_code IS NULL OR u.id_code ILIKE '%' || :search_id_code || '%')
  AND (:search_display_name IS NULL OR u.display_name ILIKE '%' || :search_display_name || '%')
  AND (:search_csa_title IS NULL OR u.csa_title ILIKE '%' || :search_csa_title || '%')
  AND (:search_csa_email IS NULL OR u.csa_email ILIKE '%' || :search_csa_email || '%')
  AND (:search_authority IS NULL OR EXISTS (
      SELECT 1
      FROM unnest(ua.authority_name) AS authority
      WHERE authority ILIKE '%' || :search_authority || '%'
  ))
  AND (:search_department IS NULL OR u.department ILIKE '%' || :search_department || '%')
  AND u.id_code NOT IN (:excluded_users)
ORDER BY 
   CASE WHEN :sorting = 'name asc' THEN u.first_name END ASC,
   CASE WHEN :sorting = 'name desc' THEN u.first_name END DESC,
   CASE WHEN :sorting = 'idCode asc' THEN u.id_code END ASC,
   CASE WHEN :sorting = 'idCode desc' THEN u.id_code END DESC,
   CASE WHEN :sorting = 'Role asc' THEN ua.authority_name END ASC,
   CASE WHEN :sorting = 'Role desc' THEN ua.authority_name END DESC,
   CASE WHEN :sorting = 'displayName asc' THEN u.display_name END ASC,
   CASE WHEN :sorting = 'displayName desc' THEN u.display_name END DESC,
   CASE WHEN :sorting = 'csaTitle asc' THEN u.csa_title END ASC,
   CASE WHEN :sorting = 'csaTitle desc' THEN u.csa_title END DESC,
   CASE WHEN :sorting = 'csaEmail asc' THEN u.csa_email END ASC,
   CASE WHEN :sorting = 'csaEmail desc' THEN u.csa_email END DESC,
   CASE WHEN :sorting = 'department asc' THEN u.department END ASC,
   CASE WHEN :sorting = 'department desc' THEN u.department END DESC,
   CASE WHEN :sorting = 'jiraAccountId asc' THEN u.jira_account_id END ASC,
   CASE WHEN :sorting = 'jiraAccountId desc' THEN u.jira_account_id END DESC,
   CASE WHEN :sorting = 'customerSupportStatus asc' THEN csa.status END ASC,
   CASE WHEN :sorting = 'customerSupportStatus desc' THEN csa.status END DESC
OFFSET ((GREATEST(:page, 1) - 1) * :page_size) LIMIT :page_size;
