select
    *
from
    message as m
where
    m.chat_base_id = :chatBaseId and
    m.content is not null and
    m.content != ''
order by
    m.created asc
;
