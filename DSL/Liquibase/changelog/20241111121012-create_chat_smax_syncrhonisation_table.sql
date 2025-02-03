-- liquibase formatted sql
-- changeset jannostern:20241111121012

create table if not exists chat_smax_syncrhonization (
    id bigserial not null,
    chat_base_id varchar(36) not null,
    status text not null default 'NONE',
    error_code text,
    error_message text,
    created timestamptz not null default current_timestamp
);

create index if not exists idx_chat_smax_syncrhonization_chat_base_id on chat_smax_syncrhonization (chat_base_id);
create index if not exists idx_chat_smax_syncrhonization_status on chat_smax_syncrhonization (status);
create index if not exists idx_chat_smax_syncrhonization_created on chat_smax_syncrhonization (created);
