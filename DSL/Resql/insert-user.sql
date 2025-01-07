INSERT INTO "user" (login, first_name, last_name, display_name, password_hash, id_code, status, created, csa_title, csa_email, department)
VALUES (:userIdCode, :firstName, :lastName, :displayName, :displayName, :userIdCode, (:status)::user_status, :created::timestamp with time zone, :csaTitle, :csaEmail, :department);
