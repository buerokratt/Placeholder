select
    *
from
    chat as c
where
    c.created > coalesce((
        select
            created
        from
            chat
        where
            base_id = :chatBaseId and
            status='ENDED'
    ), '1970-01-01') and
    c.status = 'ENDED'
order by
    created asc
limit 1
;