import { createClient } from '@supabase/supabase-js'

const ENV_URL = import.meta.env.VITE_SUPABASE_URL
const ENV_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasEnv = Boolean(ENV_URL && ENV_ANON_KEY)

export const supabase = hasEnv
  ? createClient(ENV_URL, ENV_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null

export function hasSupabaseConfig() {
  return hasEnv
}

