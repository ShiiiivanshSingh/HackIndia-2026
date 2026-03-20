-- geoserve: listings RLS + strict status transitions
-- run in supabase sql editor

alter table public.listings enable row level security;

-- realtime benefits from full replica identity for update payloads
alter table public.listings replica identity full;

-- clear any earlier permissive policies (optional)
do $$
begin
  -- ignore missing policies
  begin
    drop policy if exists "anon select active listings" on public.listings;
  exception when others then null;
  end;
  begin
    drop policy if exists "anon insert active listings" on public.listings;
  exception when others then null;
  end;
  begin
    drop policy if exists "anon claim active listings" on public.listings;
  exception when others then null;
  end;
  begin
    drop policy if exists "anon complete claimed listings" on public.listings;
  exception when others then null;
  end;
end $$;

-- SELECT policies (for map + history)
drop policy if exists "auth select active listings" on public.listings;
create policy "auth select active listings"
on public.listings
for select
to authenticated
using (status = 'active');

drop policy if exists "auth select own listings"
on public.listings;
create policy "auth select own listings"
on public.listings
for select
to authenticated
using (donor_id = auth.uid() or collector_id = auth.uid());

-- INSERT policy (donor creates an active listing)
drop policy if exists "auth donor insert active listing" on public.listings;
create policy "auth donor insert active listing"
on public.listings
for insert
to authenticated
with check (
  donor_id = auth.uid()
  and status = 'active'
  and expiry_time > now()
);

-- CLAIM policy (collector reserves listing for 30 minutes)
drop policy if exists "auth collector claim active listing" on public.listings;
create policy "auth collector claim active listing"
on public.listings
for update
to authenticated
using (
  status = 'active'
  and expiry_time > now()
)
with check (
  status = 'claimed'
  and collector_id = auth.uid()
  and pickup_stage = 'claimed'
  and claimed_at is not null
  and claimed_until is not null
  and claimed_until = claimed_at + interval '30 minutes'
);

-- PICKUP STAGE policy (optional intermediate stages while claimed)
drop policy if exists "auth collector set pickup stage" on public.listings;
create policy "auth collector set pickup stage"
on public.listings
for update
to authenticated
using (
  status = 'claimed'
  and collector_id = auth.uid()
)
with check (
  status = 'claimed'
  and pickup_stage in ('claimed','on_the_way','picked_up')
);

-- COMPLETE policy
drop policy if exists "auth collector complete claimed listing" on public.listings;
create policy "auth collector complete claimed listing"
on public.listings
for update
to authenticated
using (
  status = 'claimed'
  and collector_id = auth.uid()
)
with check (
  status = 'completed'
  and pickup_stage = 'completed'
  and completed_at is not null
);

-- CLAIM auto-expiry (service role / scheduled job)
drop policy if exists "service_role expire claimed listings" on public.listings;
create policy "service_role expire claimed listings"
on public.listings
for update
to service_role
using (
  status = 'claimed'
  and claimed_until is not null
  and claimed_until < now()
)
with check (
  status = 'active'
  and pickup_stage = 'active'
  and collector_id is null
  and claimed_at is null
  and claimed_until is null
);

