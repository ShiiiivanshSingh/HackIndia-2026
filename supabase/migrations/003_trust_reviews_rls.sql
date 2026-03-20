-- geoserve: RLS for profiles/reviews/notifications needed for trust + rating flow
-- run in supabase sql editor

-- profiles: only owners can read their own trust score
alter table public.profiles enable row level security;
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

-- reviews: allow insert only by parties of completed listings
alter table public.reviews enable row level security;
drop policy if exists "reviews insert by listing party" on public.reviews;
create policy "reviews insert by listing party"
on public.reviews
for insert
to authenticated
with check (
  rater_id = auth.uid()
  and rating between 1 and 5
  and exists (
    select 1
    from public.listings l
    where
      l.id = listing_id
      and l.status = 'completed'
      and (l.donor_id = auth.uid() or l.collector_id = auth.uid())
  )
);

-- reviews select: allow rater to read their own reviews
drop policy if exists "reviews select own rater" on public.reviews;
create policy "reviews select own rater"
on public.reviews
for select
to authenticated
using (rater_id = auth.uid());

-- notifications: owners can read + mark as read
alter table public.notifications enable row level security;
drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications mark read own" on public.notifications;
create policy "notifications mark read own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

