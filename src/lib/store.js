// Unified data layer for check-ins.
//
// It speaks to Supabase (Postgres + Realtime) when credentials are present,
// and otherwise falls back to a local mock backed by localStorage +
// BroadcastChannel — which still gives real-time updates ACROSS TABS on one
// machine. Cross-DEVICE realtime (phone -> laptop) requires Supabase.
//
// Every screen in the app talks only to this module, so the rest of the code
// never has to know which backend is live.

import { supabase, isSupabaseConfigured, TABLE } from './supabase.js'
import { sha256Hex, receiptPayload } from './hash.js'

export const backendMode = isSupabaseConfigured ? 'supabase' : 'mock'

export const STATUS = {
  WAITING: 'waiting',
  IN_CONSULT: 'in_consult',
  DONE: 'done',
  LEFT: 'left',
  NO_SHOW: 'no_show',
  PAUSED: 'paused',
}

// Statuses that still occupy the active waiting queue.
const ACTIVE = new Set([STATUS.WAITING, STATUS.PAUSED])

const LS_KEY = 'ethos_checkins'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ethos') : null
// Same-tab subscribers. A BroadcastChannel does NOT deliver to its own
// instance, and `storage` events don't fire in the tab that made the change,
// so we notify local listeners directly for same-tab updates (e.g. reception
// clicking queue controls on the dashboard).
const localListeners = new Set()
let channelSeq = 0 // ensures every Supabase realtime channel name is unique

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const nowIso = () => new Date().toISOString()
const newId = () =>
  crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2)

// Queue ordering: emergencies first, then by arrival time (oldest first).
export function sortQueue(rows) {
  return [...rows].sort((a, b) => {
    const ap = a.priority === 'emergency' ? 0 : 1
    const bp = b.priority === 'emergency' ? 0 : 1
    if (ap !== bp) return ap - bp
    return new Date(a.check_in_time) - new Date(b.check_in_time)
  })
}

export function isActive(row) {
  return ACTIVE.has(row.status)
}

// Bucket an age into a group used across the reports filters + metrics.
export function ageGroup(age) {
  if (age == null || age === '' || Number.isNaN(Number(age))) return 'Unknown'
  const a = Number(age)
  if (a <= 12) return 'Child'
  if (a <= 17) return 'Teen'
  if (a <= 59) return 'Adult'
  return 'Senior'
}


// --------------------------------------------------------------------------
// Mock backend (localStorage + BroadcastChannel)
// --------------------------------------------------------------------------
function mockRead() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}
function mockWrite(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows))
  channel?.postMessage('change') // notify other tabs
  localListeners.forEach((fn) => fn()) // notify this tab
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------
export async function listCheckins() {
  if (backendMode === 'supabase') {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('check_in_time', { ascending: true })
    if (error) throw error
    return data || []
  }
  return mockRead()
}

// Next sequential appointment ID (APT-0001, APT-0002, …). Uses a Postgres
// sequence in Supabase mode; a localStorage counter in mock mode.
export async function nextApptId() {
  if (backendMode === 'supabase') {
    const { data, error } = await supabase.rpc('next_appt_id')
    if (error) throw error
    return data
  }
  const n = (parseInt(localStorage.getItem('ethos_appt_seq') || '0', 10) || 0) + 1
  localStorage.setItem('ethos_appt_seq', String(n))
  return `APT-${String(n).padStart(4, '0')}`
}

// Booking type = how the patient entered:
//   'reception' -> Walk-in (added at the desk)
//   'self'      -> Pre-booked (self check-in via QR)
export function bookingType(row) {
  return row.source === 'reception' ? 'Walk-in' : 'Pre-booked'
}

export async function createCheckin({ name, priority = 'normal', gender = null, age = null, source = 'self' }) {
  const id = newId()
  const check_in_time = nowIso()
  const appointment_id = await nextApptId() // always auto + sequential
  const hash = await sha256Hex(receiptPayload({ appointment_id, name, check_in_time, id }))
  const row = {
    id,
    name,
    appointment_id,
    check_in_time,
    status: STATUS.WAITING,
    priority,
    gender: gender || null,
    age: age != null && age !== '' ? Number(age) : null,
    source,
    hash,
  }

  if (backendMode === 'supabase') {
    const { data, error } = await supabase.from(TABLE).insert(row).select().single()
    if (error) throw error
    return data
  }

  const rows = mockRead()
  rows.push(row)
  mockWrite(rows)
  return row
}

export async function updateStatus(id, status) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
    if (error) throw error
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, status } : r))
  mockWrite(rows)
}

// Look up a patient by appointment ID (used by the pharmacy counter).
export async function findCheckinByAppointment(appointmentId) {
  if (!appointmentId) return null
  const target = appointmentId.trim().toUpperCase()
  const rows = await listCheckins()
  const matches = rows
    .filter((r) => (r.appointment_id || '').toUpperCase() === target)
    .sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time))
  return matches[0] || null
}

// --------------------------------------------------------------------------
// Pharmacy: medicines inventory + bills
// --------------------------------------------------------------------------
const MED_KEY = 'ethos_medicines'
const medListeners = new Set()
const medRead = () => { try { return JSON.parse(localStorage.getItem(MED_KEY) || '[]') } catch { return [] } }
const medWrite = (rows) => { localStorage.setItem(MED_KEY, JSON.stringify(rows)); medListeners.forEach((fn) => fn()) }

export async function listMedicines() {
  if (backendMode === 'supabase') {
    const { data, error } = await supabase.from('medicines').select('*').order('name')
    if (error) throw error
    return data || []
  }
  return medRead()
}
export async function addMedicine(med) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from('medicines').insert(med)
    if (error) throw error
    return
  }
  medWrite([...medRead(), { id: newId(), created_at: nowIso(), ...med }])
}
export async function updateMedicine(id, fields) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from('medicines').update(fields).eq('id', id)
    if (error) throw error
    return
  }
  medWrite(medRead().map((r) => (r.id === id ? { ...r, ...fields } : r)))
}
export async function deleteMedicine(id) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from('medicines').delete().eq('id', id)
    if (error) throw error
    return
  }
  medWrite(medRead().filter((r) => r.id !== id))
}
export function subscribeMedicines(callback) {
  let cancelled = false
  const push = async () => { try { const rows = await listMedicines(); if (!cancelled) callback(rows) } catch (e) { console.error(e) } }
  push()
  if (backendMode === 'supabase') {
    const sub = supabase.channel(`medicines-rt-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, push).subscribe()
    return () => { cancelled = true; supabase.removeChannel(sub) }
  }
  const onStorage = (e) => { if (e.key === MED_KEY) push() }
  medListeners.add(push)
  window.addEventListener('storage', onStorage)
  return () => { cancelled = true; medListeners.delete(push); window.removeEventListener('storage', onStorage) }
}

// Save a paid pharmacy bill onto the patient's check-in row (powers the PDF + revenue).
export async function savePharmacyBill(checkinId, bill) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ pharmacy: bill }).eq('id', checkinId)
    if (error) throw error
    return
  }
  mockWrite(mockRead().map((r) => (r.id === checkinId ? { ...r, pharmacy: bill } : r)))
}

export async function saveNotes(id, notes) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ notes }).eq('id', id)
    if (error) throw error
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, notes } : r))
  mockWrite(rows)
}

export async function setPriority(id, priority) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ priority }).eq('id', id)
    if (error) throw error
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, priority } : r))
  mockWrite(rows)
}

// Clear everything — handy for demos / resets.
export async function resetAll() {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    return
  }
  mockWrite([])
}

// Subscribe to live changes. Fires the callback with the full, fresh list
// whenever anything changes. Returns an unsubscribe function.
export function subscribe(callback) {
  let cancelled = false
  const push = async () => {
    try {
      const rows = await listCheckins()
      if (!cancelled) callback(rows)
    } catch (e) {
      console.error('subscribe refresh failed', e)
    }
  }

  // Initial load.
  push()

  if (backendMode === 'supabase') {
    // Each subscriber needs its OWN uniquely-named channel — Supabase won't
    // let a second postgres_changes listener attach to an already-subscribed
    // channel (e.g. the dashboard and the 3D view subscribing at once).
    const sub = supabase
      .channel(`checkins-realtime-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, push)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(sub)
    }
  }

  // Mock: react to same-tab mutations, cross-tab broadcasts, and storage events.
  const onMsg = () => push()
  const onStorage = (e) => {
    if (e.key === LS_KEY) push()
  }
  localListeners.add(push)
  channel?.addEventListener('message', onMsg)
  window.addEventListener('storage', onStorage)
  return () => {
    cancelled = true
    localListeners.delete(push)
    channel?.removeEventListener('message', onMsg)
    window.removeEventListener('storage', onStorage)
  }
}
