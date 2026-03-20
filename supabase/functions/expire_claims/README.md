## expire_claims (Edge Function)

What it does:
- finds `public.listings` rows where `status = 'claimed'` and `claimed_until < now()`
- resets them back to `status = 'active'` and clears collector reservation fields
- inserts a `notifications` row (type `claim_expired`) for the donor (optional)

Scheduling:
- deploy the function first from Supabase dashboard or via `supabase functions deploy`
- add a scheduler/cron to run it every 1 minute (or 5 minutes for lower load)

Environment variables (provided by supabase at deploy time):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

