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
export async function sendPatientNotification(patientId, title, body) {
  if (!patientId) return
  if (backendMode === 'supabase') {
    try {
      await supabase.from('notifications').insert({
        patient_id: patientId,
        title,
        body,
        is_read: false,
      })
    } catch (e) {
      console.warn('Failed to insert notification into Supabase:', e)
    }
  }
}

export async function listCheckins() {
  if (backendMode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*, profiles:patient_id(phone, blood_group, height_cm, weight_kg, emergency_contact_phone, date_of_birth, gender)')
        .order('check_in_time', { ascending: true })

      if (!error && data) {
        // Fetch any profiles by name if patient_id was not linked directly
        const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, phone, blood_group, height_cm, weight_kg, emergency_contact_phone, date_of_birth, gender')

        return data.map((r) => {
          const matchedProf = r.profiles || allProfiles?.find((p) => p.id === r.patient_id || (p.full_name && r.name && p.full_name.trim().toLowerCase() === r.name.trim().toLowerCase()))
          return {
            ...r,
            phone: r.phone || matchedProf?.phone || null,
            blood_group: r.blood_group || matchedProf?.blood_group || null,
            height: r.height || matchedProf?.height_cm || null,
            weight: r.weight || matchedProf?.weight_kg || null,
            gender: r.gender || matchedProf?.gender || null,
            emergency_contact: r.emergency_contact || matchedProf?.emergency_contact_phone || null,
          }
        })
      }
    } catch (err) {
      console.warn('Supabase listCheckins fallback to standard select:', err)
    }
    const { data } = await supabase.from(TABLE).select('*').order('check_in_time', { ascending: true })
    if (data) return data
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

// Next queue token (Q-0001, Q-0002, …) — minted for EVERY check-in.
export async function nextQueueId() {
  if (backendMode === 'supabase') {
    const { data, error } = await supabase.rpc('next_queue_id')
    if (error) throw error
    return data
  }
  const n = (parseInt(localStorage.getItem('ethos_queue_seq') || '0', 10) || 0) + 1
  localStorage.setItem('ethos_queue_seq', String(n))
  return `Q-${String(n).padStart(4, '0')}`
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
    try {
      const { data, error } = await supabase.rpc('get_doctor_by_code', { p_code: code.trim() })
      if (!error && data && data.length > 0) {
        const doc = data[0]
        return {
          id: doc.id,
          full_name: doc.full_name,
          department_id: doc.department_id,
          departments: { name: doc.department_name },
          is_nurse: doc.is_nurse || false
        }
      }
    } catch (e) {
      console.warn('Supabase get_doctor_by_code RPC error, using fallback:', e)
    }
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
  // Access codes are stored upper-cased (the Admin form force-uppercases on
  // save), so normalise the entered code the same way — otherwise a code typed
  // in a different case never matches.
  const pin = String(code).trim().toUpperCase()

  if (backendMode === 'supabase') {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role, access_code, department_id, is_active')
      .eq('access_code', pin)
      .eq('is_active', true)
      .maybeSingle()

    // A real, reachable `staff` table exists in live mode — an actual "no
    // match" (data is null, no error) must mean the code is invalid, not
    // fall through to the local demo dictionary below. Only a genuine query
    // failure (table missing, network issue) falls back, same as the other
    // Supabase-backed reads in this file.
    if (!error) return data || null
    console.warn('Staff lookup failed, falling back to local demo staff:', error.message)
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
  // Assigning a department is the moment a queue-only patient becomes a booked
  // appointment — mint the APT id here.
  const appointment_id = await nextApptId()
  const updatePayload = {
    department_id: departmentId,
    appointment_id,
    status: STATUS.WAITING_DEPARTMENT,
  }

  if (backendMode === 'supabase') {
    try {
      supabase.from(TABLE).select('patient_id').eq('id', checkinId).maybeSingle().then(({ data }) => {
        if (data?.patient_id) {
          sendPatientNotification(data.patient_id, '🏥 OPD Department Assigned', 'Your ticket has been forwarded to the Doctor OPD queue.')
        }
      }).catch(() => {})

      const { error } = await supabase.from(TABLE).update(updatePayload).eq('id', checkinId)
      if (error) {
        console.warn('Supabase forwardToDepartment error, applying local fallback:', error)
      }
    } catch (e) {
      console.warn('Supabase forwardToDepartment exception:', e)
    }
  }

  const rows = mockRead().map((r) => (r.id === checkinId ? { ...r, ...updatePayload } : r))
  mockWrite(rows)
  notifyLocalListeners()
}

export async function createCheckin({ name, priority = 'normal', gender = null, age = null, source = 'self', department_id = null }) {
  const id = newId()
  const check_in_time = nowIso()
  const queue_id = await nextQueueId() // token for EVERY patient
  // Appointment ID is only minted once a department is assigned. Patients who
  // skip department selection sit in the reception queue with a queue_id only.
  const appointment_id = department_id ? await nextApptId() : null
  const hash = await sha256Hex(receiptPayload({ appointment_id: appointment_id || queue_id, name, check_in_time, id }))
  const initialStatus = department_id ? STATUS.WAITING_DEPARTMENT : STATUS.WAITING_RECEPTION
  const row = {
    id,
    name,
    queue_id,
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
    try {
      supabase.from(TABLE).select('patient_id').eq('id', id).maybeSingle().then(({ data }) => {
        if (data?.patient_id) {
          if (status === STATUS.IN_CONSULT) {
            sendPatientNotification(data.patient_id, "📣 It's Your Turn!", "Please proceed to your consultation counter / OPD room now.")
          } else if (status === STATUS.DONE) {
            sendPatientNotification(data.patient_id, "✓ Visit Completed", "Your OPD consultation is complete. Thank you!")
          }
        }
      }).catch(() => {})

      const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
      if (error) console.warn('Supabase updateStatus error:', error)
    } catch (e) {
      console.warn('Supabase updateStatus exception:', e)
    }
  }

  const rows = mockRead().map((r) => (r.id === id ? { ...r, status } : r))
  mockWrite(rows)
  notifyLocalListeners()
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

// --------------------------------------------------------------------------
// IPD: wards → rooms → beds → admissions (+ room billing)
// --------------------------------------------------------------------------

// Chargeable days = CEIL((discharge - admission) / 24h), minimum 1 day.
export function roomDays(admissionISO, dischargeISO = nowIso()) {
  const ms = new Date(dischargeISO).getTime() - new Date(admissionISO).getTime()
  return Math.max(1, Math.ceil(ms / (24 * 3600 * 1000)))
}

// Full ward → room → bed tree, each bed carrying its active admission (if any).
export async function listWardTree() {
  if (backendMode !== 'supabase') return []
  const [{ data: wards }, { data: rooms }, { data: beds }, { data: adms }] = await Promise.all([
    supabase.from('wards').select('*, departments(name)').order('name'),
    supabase.from('rooms').select('*').order('room_number'),
    supabase.from('beds').select('*').order('bed_number'),
    supabase.from('admissions').select('*').eq('status', 'admitted'),
  ])
  const admByBed = new Map((adms || []).map((a) => [a.bed_id, a]))
  return (wards || []).map((w) => ({
    ...w,
    department_name: w.departments?.name || null,
    rooms: (rooms || [])
      .filter((r) => r.ward_id === w.id)
      .map((r) => ({
        ...r,
        beds: (beds || [])
          .filter((b) => b.room_id === r.id)
          .map((b) => ({ ...b, admission: admByBed.get(b.id) || null })),
      })),
  }))
}

export async function listAdmissions(status = null) {
  if (backendMode !== 'supabase') return []
  let q = supabase
    .from('admissions')
    .select('*, departments(name), wards(name), rooms(room_number, daily_rate, room_type), beds(bed_number)')
    .order('admission_date', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) { console.warn('listAdmissions error:', error); return [] }
  return data || []
}

export async function admitPatient(payload) {
  if (backendMode !== 'supabase') throw new Error('Inpatient admissions require the live database.')
  const { data, error } = await supabase
    .from('admissions')
    .insert({ ...payload, status: 'admitted' })
    .select()
    .single()
  if (error) {
    // 23505 = the uniq_active_bed_admission partial unique index fired.
    if (error.code === '23505') throw new Error('That bed already has an active admission — pick another bed.')
    throw error
  }
  if (payload.bed_id) await supabase.from('beds').update({ status: 'Occupied' }).eq('id', payload.bed_id)
  if (payload.patient_id) {
    sendPatientNotification(payload.patient_id, '🏥 Admitted to Ward', 'You have been admitted. Your room and bed are ready.')
  }
  notifyLocalListeners()
  return data
}

export async function dischargePatient(admissionId) {
  if (backendMode !== 'supabase') throw new Error('Inpatient discharge requires the live database.')
  const { data: adm, error: e1 } = await supabase
    .from('admissions')
    .select('*, rooms(daily_rate)')
    .eq('id', admissionId)
    .single()
  if (e1 || !adm) throw e1 || new Error('Admission not found.')
  const rate = Number(adm.rooms?.daily_rate || 0)
  const days = roomDays(adm.admission_date)
  const room_charges = days * rate
  const { error } = await supabase
    .from('admissions')
    .update({ status: 'discharged', discharge_date: nowIso(), room_charges })
    .eq('id', admissionId)
  if (error) throw error
  // Free the bed into the cleaning cycle.
  if (adm.bed_id) await supabase.from('beds').update({ status: 'Cleaning' }).eq('id', adm.bed_id)
  if (adm.patient_id) {
    sendPatientNotification(adm.patient_id, '✓ Discharged', `Your discharge is complete. Room charges: ₹${room_charges}.`)
  }
  notifyLocalListeners()
  return { days, room_charges }
}

export async function setBedStatus(bedId, status) {
  if (backendMode !== 'supabase') return
  const { error } = await supabase.from('beds').update({ status }).eq('id', bedId)
  if (error) throw error
  notifyLocalListeners()
}

// Realtime ward tree — beds/admissions changes re-push the whole tree.
export function subscribeIPD(callback) {
  let cancelled = false
  const push = async () => {
    try {
      const tree = await listWardTree()
      if (!cancelled) callback(tree)
    } catch (e) {
      console.error('IPD subscribe refresh failed', e)
    }
  }
  push()
  if (backendMode === 'supabase') {
    const sub = supabase
      .channel(`ipd-realtime-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds' }, push)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, push)
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(sub) }
  }
  return () => { cancelled = true }
}

// --------------------------------------------------------------------------
// Structured prescriptions + dosage math
// --------------------------------------------------------------------------

// Save the doctor's STRUCTURED prescription array to the consultation record.
// Shape per item:
//   { medicine_name, dosage, frequency, duration_days, route,
//     before_after_food, timing:{morning,afternoon,evening,night},
//     special_instructions }
export async function savePrescriptions(id, prescriptions) {
  if (backendMode === 'supabase') {
    const { error } = await supabase.from(TABLE).update({ prescriptions }).eq('id', id)
    if (error) throw error
    notifyLocalListeners()
    return
  }
  const rows = mockRead().map((r) => (r.id === id ? { ...r, prescriptions } : r))
  mockWrite(rows)
}

// Total units required to dispense a full course = Dosage × Frequency × Duration.
export function requiredUnits(rx) {
  const dosage = Number(rx?.dosage) || 0
  const frequency = Number(rx?.frequency) || 0
  const days = Number(rx?.duration_days) || 0
  return Math.max(0, Math.ceil(dosage * frequency * days))
}

// Atomic stock deduction — only succeeds if enough stock is present, so two
// pharmacists dispensing at once can't drive stock negative.
export async function deductStock(medicineId, qty) {
  if (backendMode !== 'supabase') {
    const rows = medRead()
    const m = rows.find((r) => r.id === medicineId)
    if (!m || (m.stock || 0) < qty) return false
    medWrite(rows.map((r) => (r.id === medicineId ? { ...r, stock: r.stock - qty } : r)))
    return true
  }
  // Conditional update: WHERE stock >= qty. If no row returns, stock was short.
  const { data, error } = await supabase.rpc('deduct_medicine_stock', { p_id: medicineId, p_qty: qty })
  if (error) throw error
  return data === true
}
