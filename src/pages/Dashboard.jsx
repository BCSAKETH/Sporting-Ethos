import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Logo from '../components/Logo.jsx'
import QueueCard from '../components/QueueCard.jsx'
import { clearStaffSession, getStaffSession } from './AccessGate.jsx'
import {
  subscribe,
  updateStatus,
  setPriority,
  sortQueue,
  STATUS,
  createCheckin,
  forwardToDepartment,
  listDepartments,
} from '../lib/store.js'
import { autoPrimeVoice, announce, chime } from '../lib/voice.js'
import { sendIntercom, onIntercom } from '../lib/intercom.js'

const AVG_MINUTES = 5

const minsSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
const mmss = (iso) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [flashIds, setFlashIds] = useState(new Set())
  const [, forceTick] = useState(0)
  const seenIds = useRef(null)

  const [ring, setRing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [forwardPatient, setForwardPatient] = useState(null)
  const [departments, setDepartments] = useState([])

  const session = getStaffSession()

  useEffect(() => {
    autoPrimeVoice()
    listDepartments().then(setDepartments).catch(console.error)
  }, [])

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Intercom listener: Doctor calls Reception
  useEffect(() => {
    return onIntercom((msg) => {
      if (msg.type === 'call_reception') {
        setRing(msg)
        chime()
        announce(`${msg.from || 'OPD Doctor'} is calling reception desk`)
        setTimeout(() => setRing(null), 15000)
      }
    })
  }, [])

  useEffect(() => {
    const unsub = subscribe((next) => {
      if (seenIds.current === null) {
        seenIds.current = new Set(next.map((r) => r.id))
      } else {
        const fresh = next.filter((r) => !seenIds.current.has(r.id))
        fresh.forEach((r) => seenIds.current.add(r.id))
        if (fresh.length) {
          setFlashIds((prev) => {
            const s = new Set(prev)
            fresh.forEach((r) => s.add(r.id))
            return s
          })
          setTimeout(() => {
            setFlashIds((prev) => {
              const s = new Set(prev)
              fresh.forEach((r) => s.delete(r.id))
              return s
            })
          }, 1500)
          fresh.forEach((r) => announce(`${r.name} has arrived at help desk`))
          chime()
        }
      }
      setRows(next)
    })
    return unsub
  }, [])

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])

  const rowsWithDept = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      department_name: r.department_name || (r.department_id ? deptMap.get(r.department_id) : null),
    }))
  }, [rows, deptMap])

  // Reception sees patients waiting for reception or currently called to counter before department assignment
  const receptionQueue = useMemo(() => {
    const unassigned = rowsWithDept.filter(
      (r) =>
        r.status === STATUS.WAITING_RECEPTION ||
        r.status === STATUS.WAITING ||
        (r.status === STATUS.IN_CONSULT && !r.department_id)
    )
    return sortQueue(unassigned)
  }, [rowsWithDept])

  // Patients currently in consultation in doctor rooms
  const inConsult = useMemo(() => {
    return rowsWithDept.filter((r) => r.status === STATUS.IN_CONSULT)
  }, [rowsWithDept])

  const [calledIds, setCalledIds] = useState(new Set())

  function callNextPatient() {
    if (receptionQueue.length === 0) return
    const first = receptionQueue[0]
    setCalledIds((prev) => new Set(prev).add(first.id))
    chime()
    announce(`Patient ${first.name}, please proceed to Reception Counter 1`)
    // Reception's job is to route the patient to the RIGHT department queue —
    // not to start the consultation. Open the department-assignment step; the
    // doctor calls them into consultation from their department queue.
    setForwardPatient(first)
  }

  function changeStatus(id, status) {
    if (status === STATUS.IN_CONSULT) {
      setCalledIds((prev) => new Set(prev).add(id))
      const row = receptionQueue.find((r) => r.id === id) || rows.find((r) => r.id === id)
      if (row) {
        chime()
        announce(`Patient ${row.name}, please proceed to Reception Counter 1`)
      }
    }
    updateStatus(id, status)
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
              Reception &amp; Triage Desk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR(true)}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 shadow-sm transition"
            >
              📱 Show Counter QR
            </button>

            <button
              onClick={callNextPatient}
              disabled={receptionQueue.length === 0}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
            >
              📣 Call Next Patient
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              ＋ Add Walk-in Patient
            </button>

            <span className="text-xs font-medium text-slate-600 pl-2">
              {session?.name || 'Reception Staff'}
            </span>

            <button
              onClick={clearStaffSession}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      </header>

      {/* Incoming Call Ring Banner */}
      {ring && (
        <div className="bg-amber-500 text-white ring-blink shadow-lg animate-bounce">
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
            <span className="font-bold text-lg flex items-center gap-2">
              <span className="bell-shake">🔔</span>
              {ring.from || 'OPD Doctor'} is calling Reception Desk!
            </span>
            <button
              onClick={() => setRing(null)}
              className="rounded-xl bg-white/25 px-4 py-1.5 text-sm font-bold hover:bg-white/40 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-8">
        {/* Section 1: Unassigned Reception Queue */}
        <section className="fade-up">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Unassigned Reception Queue</h1>
              <p className="text-sm text-slate-500">
                Patients who skipped department selection or requested assistance at the counter.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3.5 py-1 text-sm font-bold text-amber-800">
              {receptionQueue.length} Waiting at Desk
            </span>
          </div>

          <div className="mt-4">
            {receptionQueue.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-base font-bold text-slate-700">No patients waiting at reception</p>
                <p className="mt-1 text-xs text-slate-400">
                  Patients who scan the QR code and select a department bypass reception and go straight to doctor OPD queues.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {receptionQueue.map((row, i) => (
                  <div key={row.id} className="fade-up">
                    <QueueCard
                      row={row}
                      position={i + 1}
                      isNew={flashIds.has(row.id)}
                      eta={`${Math.max(0, i * AVG_MINUTES)} min`}
                      onStatus={changeStatus}
                      onPriority={setPriority}
                      onForward={(r) => setForwardPatient(r)}
                      isCalled={calledIds.has(row.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: In Consultation (Live in Doctor OPD Rooms) */}
        <section className="fade-up">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">In Consultation (OPD Rooms)</h2>
              <p className="text-sm text-slate-500">
                Patients currently inside OPD rooms being examined by doctors.
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-3.5 py-1 text-sm font-bold text-sky-800">
              {inConsult.length} Active Consultations
            </span>
          </div>

          <div>
            {inConsult.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                No active consultations in progress.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {inConsult.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-sm flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">{row.name}</span>
                        {row.priority === 'emergency' && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                            Emergency
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-sky-700 mt-1">
                        🏥 {row.department_name || 'General OPD'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {row.age ? `${row.age} yrs` : ''} {row.gender ? `· ${row.gender}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 uppercase">
                        In Consult
                      </span>
                      <p className="font-mono text-sm font-bold text-slate-700 mt-1">
                        {mmss(row.check_in_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {showQR && <ShowQRModal onClose={() => setShowQR(false)} />}
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} />}

      {forwardPatient && (
        <ForwardModal
          patient={forwardPatient}
          departments={departments}
          onClose={() => setForwardPatient(null)}
          onForwarded={() => setForwardPatient(null)}
        />
      )}
    </div>
  )
}

function ShowQRModal({ onClose }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const checkinUrl = `${origin}/checkin`

  function downloadQR() {
    const canvas = document.getElementById('qr-hires-reception')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'opd-counter-qr.png'
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hospital Counter QR Code</h2>
            <p className="text-xs text-slate-500">Scan with mobile camera to check in</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          <div className="rounded-3xl border-4 border-emerald-600 p-6 bg-white shadow-xl text-center">
            <QRCodeCanvas value={checkinUrl} size={240} includeMargin level="M" />
            <p className="mt-4 text-xs font-bold text-slate-800 uppercase tracking-widest">
              OPD Check-In QR
            </p>
          </div>

          <div style={{ display: 'none' }}>
            <QRCodeCanvas id="qr-hires-reception" value={checkinUrl} size={1024} includeMargin level="M" />
          </div>

          <div className="flex gap-2 w-full mt-6">
            <button
              onClick={downloadQR}
              className="flex-1 rounded-2xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Download PNG
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ForwardModal({ patient, departments, onClose, onForwarded }) {
  const [departmentId, setDepartmentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleForward(e) {
    e.preventDefault()
    if (!departmentId) return setErr('Please select an OPD department.')
    setBusy(true)
    setErr('')
    try {
      await forwardToDepartment(patient.id, departmentId)
      const deptName = departments.find((d) => d.id === departmentId)?.name || 'Department'
      chime()
      announce(`Patient ${patient.name} assigned to ${deptName}`)
      onForwarded()
    } catch (err) {
      console.error(err)
      setErr(err?.message || 'Failed to forward patient to department.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Forward Patient to Doctor</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>

        <p className="mt-2 text-sm text-slate-600">
          Sending <b>{patient.name}</b> to a specialized OPD department queue.
        </p>

        <form onSubmit={handleForward} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select OPD Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input w-full font-medium text-base bg-white"
              required
            >
              <option value="">Choose OPD Department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !departmentId}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {busy ? 'Assigning…' : 'Forward to Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddPatientModal({ onClose }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    listDepartments().then(setDepartments).catch(console.error)
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Enter a name.')
    setBusy(true)
    try {
      await createCheckin({
        name: name.trim(),
        age: age || null,
        gender: gender || null,
        source: 'reception',
        department_id: departmentId || null,
      })
      onClose()
    } catch (e2) {
      console.error(e2)
      setErr('Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add Walk-in Patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Register a patient directly at the desk.</p>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="Full name" className="input w-full" />
          <div className="grid grid-cols-2 gap-3">
            <input value={age} inputMode="numeric" onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="Age" className="input" />
            <div className="grid grid-cols-3 gap-1.5">
              {['Male', 'Female', 'Other'].map((g) => (
                <button key={g} type="button" onClick={() => setGender(gender === g ? '' : g)}
                  className={`rounded-xl border px-1 py-3 text-sm font-medium ${gender === g ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  {g[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Direct Department Assignment (Optional)</span>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input w-full"
            >
              <option value="">Unassigned (Send to Help Desk Queue)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Registering…' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
