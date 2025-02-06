INSERT INTO message(chat_base_id, base_id, content, author_timestamp, author_id, author_first_name,
  author_last_name, author_role, rating, created)
VALUES (:chatId, gen_random_uuid()::varchar, :serviceContent, now(), :authorId, :authorFirstName, :authorLastName, 'buerokratt', '', now());