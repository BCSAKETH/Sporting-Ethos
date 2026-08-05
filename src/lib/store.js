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
  WAITING_RECEPTION: 'waiting_reception',
  WAITING_DEPARTMENT: 'waiting_department',
  IN_CONSULT: 'in_consult',
  DONE: 'done',
  LEFT: 'left',
  NO_SHOW: 'no_show',
  PAUSED: 'paused',
}

// Statuses that still occupy the active waiting queue.
const ACTIVE = new Set([STATUS.WAITING, STATUS.WAITING_RECEPTION, STATUS.WAITING_DEPARTMENT, STATUS.PAUSED])

const LS_KEY = 'ethos_checkins'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ethos') : null

// Same-tab subscribers. Notifies local listeners directly for same-tab updates
const localListeners = new Set()
let channelSeq = 0 // ensures every Supabase realtime channel name is unique

function notifyLocalListeners() {
  localListeners.forEach((fn) => {
    try { fn() } catch (e) { console.error(e) }
  })
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const nowIso = () => new Date().toISOString()

function newId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  const b = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // variant
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'))
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
}

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
  channel?.postMessage('change')
  notifyLocalListeners()
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

export function bookingType(row) {
  return row.source === 'reception' ? 'Walk-in' : 'Pre-booked'
}

const MOCK_DEPARTMENTS = [
  { id: 'dept-genmed', name: 'General Medicine', department_type: 'clinical' },
  { id: 'dept-cardio', name: 'Cardiology', department_type: 'clinical' },
  { id: 'dept-ortho', name: 'Orthopedics', department_type: 'clinical' },
  { id: 'dept-peds', name: 'Pediatrics', department_type: 'clinical' },
  { id: 'dept-neuro', name: 'Neurology', department_type: 'clinical' },
  { id: 'dept-derma', name: 'Dermatology', department_type: 'clinical' },
]

const MOCK_DOCTORS_BY_CODE = {
  'nurse': { id: 'nurse-er', full_name: 'ER Nurse Station', is_nurse: true, department_id: null, departments: { name: 'ER Triage & Nursing' } },
  'er-nurse': { id: 'nurse-er', full_name: 'ER Nurse Station', is_nurse: true, department_id: null, departments: { name: 'ER Triage & Nursing' } },
  '201': { id: 'nurse-er', full_name: 'ER Nurse Station', is_nurse: true, department_id: null, departments: { name: 'ER Triage & Nursing' } },
  '101': { id: 'doc-101', full_name: 'Dr. Aarav Sharma', department_id: 'dept-genmed', departments: { name: 'General Medicine' } },
  'doc-genmed': { id: 'doc-101', full_name: 'Dr. Aarav Sharma', department_id: 'dept-genmed', departments: { name: 'General Medicine' } },
  '102': { id: 'doc-102', full_name: 'Dr. Rohan Mehta', department_id: 'dept-cardio', departments: { name: 'Cardiology' } },
  'doc-cardio': { id: 'doc-102', full_name: 'Dr. Rohan Mehta', department_id: 'dept-cardio', departments: { name: 'Cardiology' } },
  '103': { id: 'doc-103', full_name: 'Dr. Vikram Singh', department_id: 'dept-ortho', departments: { name: 'Orthopedics' } },
  'doc-ortho': { id: 'doc-103', full_name: 'Dr. Vikram Singh', department_id: 'dept-ortho', departments: { name: 'Orthopedics' } },
  '104': { id: 'doc-104', full_name: 'Dr. Priya Nair', department_id: 'dept-peds', departments: { name: 'Pediatrics' } },
  'doc-peds': { id: 'doc-104', full_name: 'Dr. Priya Nair', department_id: 'dept-peds', departments: { name: 'Pediatrics' } },
  '105': { id: 'doc-105', full_name: 'Dr. Ishaan Verma', department_id: 'dept-neuro', departments: { name: 'Neurology' } },
  'doc-neuro': { id: 'doc-105', full_name: 'Dr. Ishaan Verma', department_id: 'dept-neuro', departments: { name: 'Neurology' } },
  '106': { id: 'doc-106', full_name: 'Dr. Sanjay Gupta', department_id: 'dept-derma', departments: { name: 'Dermatology' } },
  'doc-derma': { id: 'doc-106', full_name: 'Dr. Sanjay Gupta', department_id: 'dept-derma', departments: { name: 'Dermatology' } },
  'ethos': { id: 'doc-chief', full_name: 'Chief Medical Officer', department_id: null, departments: { name: 'All Departments' } },
}

export async function listDepartments() {
  if (backendMode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, department_type')
        .eq('is_active', true)
        .order('name')
      if (!error && data && data.length) return data
    } catch (e) {
      console.warn('Failed to fetch departments from Supabase, using mock fallback:', e)
    }
  }
  return MOCK_DEPARTMENTS
}

export async function findDoctorByCode(code) {
  if (!code) return null
  const inputCode = code.trim().toLowerCase()

  if (backendMode === 'supabase') {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, full_name, department_id, departments(name)')
      .eq('access_code', code.trim())
      .eq('is_active', true)
      .maybeSingle()

    if (!error && data) return data
  }

  if (MOCK_DOCTORS_BY_CODE[inputCode]) {
    return MOCK_DOCTORS_BY_CODE[inputCode]
  }

  return null
}

const MOCK_STAFF_KEY = 'ethos_staff'
const MOCK_DEFAULT_STAFF = [
  { id: 'stf-admin', name: 'System Administrator', role: 'admin', access_code: '9999', is_active: true },
  { id: 'stf-rec', name: 'Reception Desk 1', role: 'reception', access_code: '1111', is_active: true },
  { id: 'stf-pharm', name: 'Central Pharmacy', role: 'pharmacist', access_code: '3333', is_active: true },
  { id: 'stf-doc-gen', name: 'Dr. Rajesh Kumar', role: 'doctor', access_code: '2222', department_id: 'dept-genmed', is_active: true },
]

function mockStaffRead() {
  try {
    const raw = localStorage.getItem(MOCK_STAFF_KEY)
    if (!raw) {
      localStorage.setItem(MOCK_STAFF_KEY, JSON.stringify(MOCK_DEFAULT_STAFF))
      return MOCK_DEFAULT_STAFF
    }
    return JSON.parse(raw)
  } catch {
    return MOCK_DEFAULT_STAFF
  }
}

function mockStaffWrite(rows) {
  localStorage.setItem(MOCK_STAFF_KEY, JSON.stringify(rows))
}

export async function verifyStaffAccessCode(code) {
  if (!code) return null
  const pin = String(code).trim()

  if (backendMode === 'supabase') {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role, access_code, department_id, is_active')
      .eq('access_code', pin)
      .eq('is_active', true)
      .maybeSingle()

    if (!error && data) return data
  }

  const list = mockStaffRead()
  return list.find((s) => s.access_code === pin && s.is_active) || null
}

export async function listStaff() {
  if (backendMode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*, departments(name)')
        .order('created_at', { ascending: false })
      if (!error && data) return data
    } catch (e) {
      console.warn('Failed to list staff from Supabase:', e)
    }
  }
  return mockStaffRead()
}

export async function addStaff(staffMember) {
  const row = { id: newId(), created_at: nowIso(), is_active: true, ...staffMember }
  if (backendMode === 'supabase') {
    try {
      const { data, error } = await supabase.from('staff').insert(row).select().single()
      if (!error && data) return data
      console.warn('Supabase staff insert error, writing to local staff store:', error)
    } catch (e) {
      console.warn('Supabase staff insert exception:', e)
    }
  }
  const list = mockStaffRead()
  list.unshift(row)
  mockStaffWrite(list)
  return row
}

export async function updateStaff(id, fields) {
  if (backendMode === 'supabase') {
    try {
      const { error } = await supabase.from('staff').update(fields).eq('id', id)
      if (!error) {
        const list = mockStaffRead().map((s) => (s.id === id ? { ...s, ...fields } : s))
        mockStaffWrite(list)
        return
      }
    } catch (e) {
      console.warn('Supabase staff update exception:', e)
    }
  }
  const list = mockStaffRead().map((s) => (s.id === id ? { ...s, ...fields } : s))
  mockStaffWrite(list)
}

export async function deleteStaff(id) {
  if (backendMode === 'supabase') {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (!error) {
        const list = mockStaffRead().filter((s) => s.id !== id)
        mockStaffWrite(list)
        return
      }
    } catch (e) {
      console.warn('Supabase staff delete exception:', e)
    }
  }
  const list = mockStaffRead().filter((s) => s.id !== id)
  mockStaffWrite(list)
}

export async function forwardToDepartment(checkinId, departmentId) {
  const updatePayload = {
    department_id: departmentId,
    status: STATUS.WAITING_DEPARTMENT,
  }
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update(updatePayload).eq('id', checkinId)
    if (error) throw error
    notifyLocalListeners()
    return
  }
  const rows = mockRead().map((r) => (r.id === checkinId ? { ...r, ...updatePayload } : r))
  mockWrite(rows)
}

export async function createCheckin({ name, priority = 'normal', gender = null, age = null, source = 'self', department_id = null }) {
  const id = newId()
  const check_in_time = nowIso()
  const appointment_id = await nextApptId()
  const hash = await sha256Hex(receiptPayload({ appointment_id, name, check_in_time, id }))
  const initialStatus = department_id ? STATUS.WAITING_DEPARTMENT : STATUS.WAITING_RECEPTION
  const row = {
    id,
    name,
    appointment_id,
    check_in_time,
    status: initialStatus,
    priority,
    gender: gender || null,
    age: age != null && age !== '' ? Number(age) : null,
    source,
    department_id: department_id || null,
    hash,
  }

  if (backendMode === 'supabase') {
    const { data, error } = await supabase.from(TABLE).insert(row).select().single()
    if (error) throw error
    notifyLocalListeners()
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
    notifyLocalListeners()
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, status } : r))
  mockWrite(rows)
}

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

export async function savePharmacyBill(checkinId, bill) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ pharmacy: bill }).eq('id', checkinId)
    if (error) throw error
    notifyLocalListeners()
    return
  }
  mockWrite(mockRead().map((r) => (r.id === checkinId ? { ...r, pharmacy: bill } : r)))
}

export async function saveNotes(id, notes) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ notes }).eq('id', id)
    if (error) throw error
    notifyLocalListeners()
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, notes } : r))
  mockWrite(rows)
}

export async function setPriority(id, priority) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ priority }).eq('id', id)
    if (error) throw error
    notifyLocalListeners()
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, priority } : r))
  mockWrite(rows)
}

export async function resetAll() {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    notifyLocalListeners()
    return
  }
  mockWrite([])
}

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

  push()

  localListeners.add(push)

  if (backendMode === 'supabase') {
    const sub = supabase
      .channel(`checkins-realtime-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, push)
      .subscribe()
    return () => {
      cancelled = true
      localListeners.delete(push)
      supabase.removeChannel(sub)
    }
  }

  const onMsg = () => push()
  const onStorage = (e) => {
    if (e.key === LS_KEY) push()
  }
  channel?.addEventListener('message', onMsg)
  window.addEventListener('storage', onStorage)
  return () => {
    cancelled = true
    localListeners.delete(push)
    channel?.removeEventListener('message', onMsg)
    window.removeEventListener('storage', onStorage)
  }
}
