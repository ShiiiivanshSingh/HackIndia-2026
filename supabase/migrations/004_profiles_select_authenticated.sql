-- allow authenticated users to read trust scores for UI
-- run in supabase sql editor

alter table public.profiles enable row level security;
drop policy if exists "profiles select own" on public.profiles;

create policy "profiles select trust to authenticated"
on public.profiles
for select
to authenticated
using (true);

