import { useEffect, useMemo, useRef, useState } from 'react'
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

const AVG_MINUTES = 5

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [flashIds, setFlashIds] = useState(new Set())
  const [, forceTick] = useState(0)
  const seenIds = useRef(null)

  const [showAdd, setShowAdd] = useState(false)
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

  // Reception only sees patients who need reception / skipped department selection
  const receptionQueue = useMemo(() => {
    const unassigned = rows.filter(
      (r) => r.status === STATUS.WAITING_RECEPTION || r.status === STATUS.WAITING
    )
    return sortQueue(unassigned)
  }, [rows])

  function callNextPatient() {
    if (receptionQueue.length === 0) return
    const first = receptionQueue[0]
    chime()
    announce(`Patient ${first.name}, please proceed to Reception Counter 1`)
  }

  function changeStatus(id, status) {
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

          <div className="flex items-center gap-3">
            <button
              onClick={callNextPatient}
              disabled={receptionQueue.length === 0}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
            >
              📣 Call Next Patient
            </button>

            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              ＋ Add Walk-in Patient
            </button>

            <span className="text-xs font-medium text-slate-600 pl-2">
              {session?.name || 'Reception Staff'}
            </span>

            <button
              onClick={clearStaffSession}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        <div className="fade-up">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Unassigned Reception Queue</h1>
              <p className="text-sm text-slate-500">
                Patients who skipped department selection or requested assistance at the counter.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
              {receptionQueue.length} Waiting at Desk
            </span>
          </div>

          <div className="mt-4">
            {receptionQueue.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-base font-bold text-slate-700">No patients waiting at reception</p>
                <p className="mt-1 text-xs text-slate-400">
                  Patients who scan the QR code and select a department bypass reception and go straight to doctor OPD queues.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {receptionQueue.map((row, i) => (
                  <div key={row.id} className="fade-up flex items-center gap-3">
                    <div className="flex-1">
                      <QueueCard
                        row={row}
                        position={i + 1}
                        isNew={flashIds.has(row.id)}
                        eta={`${Math.max(0, i * AVG_MINUTES)} min`}
                        onStatus={changeStatus}
                        onPriority={setPriority}
                      />
                    </div>
                    <button
                      onClick={() => setForwardPatient(row)}
                      className="rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition shrink-0"
                    >
                      ➡ Forward to Doctor
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

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

function ForwardModal({ patient, departments, onClose, onForwarded }) {
  const [departmentId, setDepartmentId] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleForward(e) {
    e.preventDefault()
    if (!departmentId) return
    setBusy(true)
    try {
      await forwardToDepartment(patient.id, departmentId)
      const deptName = departments.find((d) => d.id === departmentId)?.name || 'Department'
      chime()
      announce(`Patient ${patient.name} assigned to ${deptName}`)
      onForwarded()
    } catch (err) {
      console.error(err)
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
              className="input w-full font-medium text-base"
              required
            >
              <option value="">Choose Department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !departmentId}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
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
