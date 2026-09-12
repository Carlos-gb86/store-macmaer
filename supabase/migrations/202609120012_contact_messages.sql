-- Store public contact enquiries behind the server boundary. The sender hash is
-- derived with the existing identity secret and supports privacy-conscious rate
-- limiting without retaining a raw IP address.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 320),
  subject text not null default '' check (char_length(subject) <= 160),
  message text not null check (char_length(message) between 10 and 5000),
  sender_hash text not null check (sender_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'NEW' check (status in ('NEW', 'READ', 'REPLIED', 'ARCHIVED')),
  created_at timestamptz not null default now()
);

create index contact_messages_created on public.contact_messages(created_at desc, id);
create index contact_messages_sender on public.contact_messages(sender_hash, created_at desc);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant all on public.contact_messages to service_role;
grant select on public.contact_messages to authenticated;
create policy admin_read on public.contact_messages
for select to authenticated using ((select public.is_admin()));
