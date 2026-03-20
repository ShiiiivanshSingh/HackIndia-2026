import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
}

Deno.serve(async (_req) => {
  ensureEnv()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const now = Date.now()
  const start = new Date(now + 55 * 60 * 1000).toISOString()
  const end = new Date(now + 65 * 60 * 1000).toISOString()

  const { data: listings, error: listErr } = await supabase
    .from('listings')
    .select('id,lat,lng,expiry_time')
    .eq('status', 'active')
    .gte('expiry_time', start)
    .lte('expiry_time', end)
    .limit(200)

  if (listErr) {
    return new Response(JSON.stringify({ ok: false, error: listErr.message }), { status: 500 })
  }

  const { data: collectors, error: colErr } = await supabase
    .from('collector_locations')
    .select('user_id,lat,lng,radius_km')
    .limit(2000)

  if (colErr) {
    return new Response(JSON.stringify({ ok: false, error: colErr.message }), { status: 500 })
  }

  const rows = Array.isArray(listings) ? listings : []
  const cols = Array.isArray(collectors) ? collectors : []

  let notified = 0

  for (const l of rows) {
    for (const c of cols) {
      const dist = haversineKm(l.lat, l.lng, c.lat, c.lng)
      if (dist > c.radius_km) continue

      const { error: insErr } = await supabase.from('notifications').upsert(
        {
          user_id: c.user_id,
          listing_id: l.id,
          type: 'expiry_approaching',
          payload: {
            expiry_time: l.expiry_time,
            distance_km: dist
          }
        },
        { onConflict: 'user_id,listing_id,type' }
      )

      if (!insErr) notified += 1
    }
  }

  return new Response(JSON.stringify({ ok: true, notified }), {
    headers: { 'content-type': 'application/json' }
  })
})

