-- geoserve: donor/collector schema foundations
-- run in supabase sql editor

create extension if not exists pgcrypto;

-- extend listings (existing table expected)
alter table public.listings
  add column if not exists donor_id uuid references auth.users(id) on delete set null,
  add column if not exists collector_id uuid references auth.users(id) on delete set null,
  add column if not exists food_type text default 'any',
  add column if not exists dietary jsonb not null default '{}'::jsonb,
  add column if not exists pickup_start_time timestamptz,
  add column if not exists address text,
  add column if not exists pickup_stage text not null default 'active',
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_until timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists expiry_time timestamptz;

-- pickup_stage constraints (ignore if already present)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_pickup_stage_check'
  ) then
    alter table public.listings
      add constraint listings_pickup_stage_check
      check (pickup_stage in ('active','claimed','on_the_way','picked_up','completed'));
  end if;
end $$;

-- basic indexes for filtering + scheduled jobs
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_expiry_time_idx on public.listings(expiry_time);
create index if not exists listings_claimed_until_idx on public.listings(claimed_until);
create index if not exists listings_donor_id_idx on public.listings(donor_id);
create index if not exists listings_collector_id_idx on public.listings(collector_id);

-- profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'donor'
    check (role in ('donor','collector','both')),
  display_name text,
  trust_score int not null default 0,
  donations_made int not null default 0,
  pickups_completed int not null default 0,
  on_time_completed int not null default 0,
  claim_expiries int not null default 0,
  created_at timestamptz not null default now()
);

-- reviews (one per rater per listing)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(listing_id, rater_id)
);

-- in-app notifications (realtime)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id, type)
);

-- collector location + radius preference (for reminders + filtering)
create table if not exists public.collector_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat float8 not null,
  lng float8 not null,
  radius_km int not null default 10,
  updated_at timestamptz not null default now()
);

-- admin queue for safety flags
create table if not exists public.account_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);

-- profiles auto-create on signup
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id, role, display_name, trust_score)
  values (
    new.id,
    'donor',
    nullif(new.raw_user_meta_data->>'display_name',''),
    0
  )
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- helper: maybe create safety flags
create or replace function public.maybe_create_account_flag(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cancellations int;
  avg_rating numeric;
begin
  select p.claim_expiries into cancellations from public.profiles p where p.user_id = target_user;
  if cancellations is null then
    cancellations := 0;
  end if;

  if cancellations >= 3 then
    if not exists (
      select 1 from public.account_flags
      where user_id = target_user and type = 'cancellation_spike' and status = 'open'
    ) then
      insert into public.account_flags(user_id, type, details)
      values (target_user, 'cancellation_spike', jsonb_build_object('claim_expiries', cancellations));
    end if;
  end if;

  select avg(r.rating) into avg_rating
  from public.reviews r
  join public.listings l on l.id = r.listing_id
  where
    -- receiver is the opposite party from the rater
    (
      case
        when r.rater_id = l.collector_id then l.donor_id
        when r.rater_id = l.donor_id then l.collector_id
        else null
      end
    ) = target_user;

  if avg_rating is not null and avg_rating <= 2.5 then
    if not exists (
      select 1 from public.account_flags
      where user_id = target_user and type = 'low_rating' and status = 'open'
    ) then
      insert into public.account_flags(user_id, type, details)
      values (target_user, 'low_rating', jsonb_build_object('avg_rating', avg_rating));
    end if;
  end if;
end $$;

-- bump donor + collector stats on insert (donations made)
create or replace function public.trg_listings_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    if new.donor_id is not null then
      update public.profiles
      set donations_made = donations_made + 1
      where user_id = new.donor_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_listings_after_insert on public.listings;
create trigger trg_listings_after_insert
after insert on public.listings
for each row execute function public.trg_listings_after_insert();

-- completion -> trust + on-time counters
create or replace function public.trg_listings_after_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'claimed' and new.status = 'completed' then
    if new.collector_id is not null then
      update public.profiles
      set
        trust_score = trust_score + 1,
        pickups_completed = pickups_completed + 1,
        on_time_completed = on_time_completed + case
          when new.completed_at is not null and new.completed_at <= new.expiry_time then 1
          else 0
        end
      where user_id = new.collector_id;

      perform public.maybe_create_account_flag(new.collector_id);
    end if;

    if new.donor_id is not null then
      update public.profiles
      set
        trust_score = trust_score + 1,
        pickups_completed = pickups_completed + 1
      where user_id = new.donor_id;

      perform public.maybe_create_account_flag(new.donor_id);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_listings_after_complete on public.listings;
create trigger trg_listings_after_complete
after update on public.listings
for each row execute function public.trg_listings_after_complete();

-- claimed -> active (claim expiry) -> trust + cancellations
create or replace function public.trg_listings_after_claim_expired()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'claimed' and new.status = 'active' then
    if old.collector_id is not null then
      update public.profiles
      set
        claim_expiries = claim_expiries + 1,
        trust_score = trust_score - 1
      where user_id = old.collector_id;

      perform public.maybe_create_account_flag(old.collector_id);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_listings_after_claim_expired on public.listings;
create trigger trg_listings_after_claim_expired
after update on public.listings
for each row execute function public.trg_listings_after_claim_expired();

-- claim -> notify donor
create or replace function public.trg_listings_after_claimed_notify_donor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active' and new.status = 'claimed' then
    if new.donor_id is not null then
      insert into public.notifications(user_id, listing_id, type, payload)
      values (
        new.donor_id,
        new.id,
        'listing_claimed',
        jsonb_build_object(
          'collector_id', new.collector_id,
          'claimed_until', new.claimed_until
        )
      )
      on conflict (user_id, listing_id, type) do nothing;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_listings_after_claimed_notify_donor on public.listings;
create trigger trg_listings_after_claimed_notify_donor
after update on public.listings
for each row execute function public.trg_listings_after_claimed_notify_donor();

-- review -> trust adjustments for receiver + safety flags
create or replace function public.trg_reviews_after_insert_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  receiver uuid;
  delta int;
begin
  select * into l from public.listings where id = new.listing_id;

  if l.status <> 'completed' then
    return new;
  end if;

  if new.rater_id = l.collector_id then
    receiver := l.donor_id;
  elsif new.rater_id = l.donor_id then
    receiver := l.collector_id;
  else
    return new;
  end if;

  -- trust delta: high rating rewards, low rating penalizes
  delta := case
    when new.rating >= 4 then 1
    when new.rating <= 2 then -2
    else 0
  end;

  if receiver is not null then
    update public.profiles
    set trust_score = trust_score + delta
    where user_id = receiver;

    perform public.maybe_create_account_flag(receiver);
  end if;

  return new;
end $$;

drop trigger if exists trg_reviews_after_insert_trust on public.reviews;
create trigger trg_reviews_after_insert_trust
after insert on public.reviews
for each row execute function public.trg_reviews_after_insert_trust();

