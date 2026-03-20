-- geoserve: persist selected role on signup
-- This updates the existing handle_new_user_profile() trigger function
-- to read the chosen role from auth user metadata.

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
    -- role is expected from supabase.auth.signUp({ options: { data: { role } } })
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'donor'),
    nullif(new.raw_user_meta_data->>'display_name', ''),
    0
  )
  on conflict (user_id) do nothing;

  return new;
end $$;

