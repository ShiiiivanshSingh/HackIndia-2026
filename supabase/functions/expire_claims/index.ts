import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function nowIso() {
  return new Date().toISOString()
}

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
}

Deno.serve(async (_req) => {
  ensureEnv()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const cutoff = nowIso()

  const { data: expired, error: listError } = await supabase
    .from('listings')
    .select('id,donor_id,collector_id')
    .eq('status', 'claimed')
    .not('claimed_until', 'is', null)
    .lt('claimed_until', cutoff)

  if (listError) {
    return new Response(JSON.stringify({ ok: false, error: listError.message }), { status: 500 })
  }

  const rows = Array.isArray(expired) ? expired : []

  // reset claim reservation
  // note: keep donor_id as-is so history remains intact
  for (const r of rows) {
    await supabase
      .from('listings')
      .update({
        status: 'active',
        pickup_stage: 'active',
        collector_id: null,
        claimed_at: null,
        claimed_until: null,
        completed_at: null
      })
      .eq('id', r.id)
      .eq('status', 'claimed')
  }

  // optional: notify donor that claim expired
  for (const r of rows) {
    if (!r.donor_id) continue
    await supabase.from('notifications').upsert(
      {
        user_id: r.donor_id,
        listing_id: r.id,
        type: 'claim_expired',
        payload: {}
      },
      { onConflict: 'user_id,listing_id,type' }
    )
  }

  return new Response(JSON.stringify({ ok: true, expired_count: rows.length }), {
    headers: { 'content-type': 'application/json' }
  })
})

