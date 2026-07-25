// Lightweight intercom between the Expert console and the Reception dashboard.
// Uses Supabase Realtime *broadcast* (ephemeral, no DB writes) so a call on one
// device instantly rings the other. Falls back to BroadcastChannel across tabs
// when Supabase isn't configured.
import { supabase, isSupabaseConfigured } from './supabase.js'

const listeners = new Set()
let supaChannel = null
let bc = null

if (isSupabaseConfigured) {
  supaChannel = supabase.channel('ethos-intercom', { config: { broadcast: { self: false } } })
  supaChannel
    .on('broadcast', { event: 'ping' }, ({ payload }) => listeners.forEach((fn) => fn(payload)))
    .subscribe()
} else if (typeof BroadcastChannel !== 'undefined') {
  bc = new BroadcastChannel('ethos-intercom')
  bc.onmessage = (e) => listeners.forEach((fn) => fn(e.data))
}

// type: 'call_reception' | 'call_expert'
export function sendIntercom(type, from = '') {
  const msg = { type, from, at: Date.now() }
  if (supaChannel) supaChannel.send({ type: 'broadcast', event: 'ping', payload: msg })
  else if (bc) bc.postMessage(msg)
}

export function onIntercom(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
