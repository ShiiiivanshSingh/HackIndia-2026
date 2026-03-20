## notify_expiring_listings (Edge Function)

What it does:
- finds `public.listings` with `status='active'` whose `expiry_time` is in the next ~10 minutes window
- loads all `collector_locations` (lat/lng + radius_km)
- computes haversine distance and notifies collectors within their radius
- inserts `notifications` rows with `type='expiry_approaching'`

Scheduling:
- deploy the function first
- run every 1-5 minutes (so reminders land around 1 hour before expiry)

Environment variables (provided by supabase at deploy time):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

