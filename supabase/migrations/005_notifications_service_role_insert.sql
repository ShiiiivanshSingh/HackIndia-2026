-- allow supabase service role to insert notifications from edge functions/triggers
-- run in supabase sql editor

alter table public.notifications enable row level security;

drop policy if exists "notifications service role insert" on public.notifications;
create policy "notifications service role insert"
on public.notifications
for insert
to service_role
with check (true);

