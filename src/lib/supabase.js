import { createClient } from '@supabase/supabase-js'

// Read Supabase credentials from Vite env vars (see .env.example).
// If they are absent, the app transparently falls back to a local mock
// backend (see store.js) so the UI always runs.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && anonKey && url.startsWith('http') && anonKey.length > 20
)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

export const TABLE = 'checkins'
