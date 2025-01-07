SELECT
    *
FROM
    chat AS c
WHERE
    c.created > COALESCE((
        SELECT
            created
        FROM
            chat
        WHERE
            base_id = :chatBaseId AND
            status = 'ENDED'
    ), '1970-01-01') AND
    c.status = 'ENDED'
ORDER BY
    created ASC
LIMIT 1;
