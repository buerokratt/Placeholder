select
    m.*
from
    chat as c left join
    message as  m on (m.chat_base_id = c.base_id)
where
    (m.content != '' and m.content is not null) and
    c.base_id = :chatBaseId and
    c.status = 'ENDED'
order by
    m.created asc
;