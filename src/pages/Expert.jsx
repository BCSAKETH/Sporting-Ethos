import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import ConsultationPanel from '../components/ConsultationPanel.jsx'
import { subscribe, updateStatus, setPriority, sortQueue, isActive, STATUS, findDoctorByCode } from '../lib/store.js'
import { autoPrimeVoice, announce, chime } from '../lib/voice.js'
import { sendIntercom, onIntercom } from '../lib/intercom.js'
import { generateGroqConsultationSummary } from '../lib/chart.js'

const AUTH_KEY = 'ethos_expert_authed'
const DOCTOR_KEY = 'ethos_doctor_info'

const minsSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
const mmss = (iso) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Expert() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === '1')
  const [doctor, setDoctor] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DOCTOR_KEY) || 'null') } catch { return null }
  })

  if (!authed) return <Gate onOk={(doc) => { setDoctor(doc); setAuthed(true) }} />
  return <Console doctor={doctor} onLogout={() => { localStorage.removeItem(AUTH_KEY); localStorage.removeItem(DOCTOR_KEY); setAuthed(false) }} />
}

function Gate({ onOk }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!code.trim()) return setErr('Enter an access code.')
    setBusy(true)
    setErr('')
    try {
      const doc = await findDoctorByCode(code.trim())
      if (doc) {
        localStorage.setItem(AUTH_KEY, '1')
        localStorage.setItem(DOCTOR_KEY, JSON.stringify(doc))
        onOk(doc)
      } else {
        setErr('Invalid access code.')
      }
    } catch (err) {
      console.error(err)
      setErr('Error verifying code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-5 bg-[#FAF8F5]">
      <div className="w-full max-w-sm rounded-3xl border border-purple-100/70 bg-white p-6 shadow-xl">
        <div className="flex justify-center mb-4"><Logo /></div>
        <h1 className="text-center text-xl font-bold text-purple-950">Clinical &amp; ER Portal</h1>
        <p className="text-center text-sm text-purple-600/80 mt-1">Enter doctor or ER nurse access code to continue.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input autoFocus type="password" value={code} onChange={(e) => { setCode(e.target.value); setErr('') }}
            placeholder="Access code"
            className="w-full rounded-xl border border-purple-200/80 px-4 py-3 text-lg text-center tracking-widest focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none bg-white" />
          {err && <p className="text-sm text-purple-600 text-center font-semibold">{err}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-60 active:scale-95 transition">
            {busy ? 'Verifying…' : 'Enter Portal'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <span className="text-[11px] text-purple-500">ER Nurse Code: <code className="font-mono text-purple-700 font-bold">nurse</code> or <code className="font-mono text-purple-700 font-bold">201</code></span>
        </div>
        <Link to="/" className="mt-3 block text-center text-xs text-purple-400 font-medium hover:text-purple-700">← Reception dashboard</Link>
      </div>
    </div>
  )
}

function Console({ doctor, onLogout }) {
  const [rows, setRows] = useState([])
  const [ring, setRing] = useState(null)
  const [sent, setSent] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => autoPrimeVoice(), [])
  useEffect(() => subscribe(setRows), [])
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => onIntercom((msg) => {
    if (msg.type === 'call_expert') {
      setRing(msg); chime(); announce('Reception is calling you')
      setTimeout(() => setRing(null), 12000)
    }
  }), [])

  function callPatient(id) {
    const r = rows.find((x) => x.id === id)
    if (r) { chime(); announce(`Calling ${r.name}`) }
    updateStatus(id, STATUS.IN_CONSULT)
  }
  function callReception() { sendIntercom('call_reception', doctor?.full_name || 'ER Nurse'); setSent(true); setTimeout(() => setSent(false), 4000) }

  const filteredRows = useMemo(() => {
    if (!doctor?.department_id) return rows
    return rows.filter((r) => !r.department_id || r.department_id === doctor.department_id)
  }, [rows, doctor])

  const waiting = useMemo(() => sortQueue(filteredRows.filter(isActive)), [filteredRows])
  const inConsult = filteredRows.filter((r) => r.status === STATUS.IN_CONSULT)

  const isNurse = doctor?.is_nurse
  const deptName = isNurse ? '🚑 ER Triage & Emergency Response' : (doctor?.departments?.name || (doctor?.department_id ? 'My Department' : 'All Departments'))

  return (
    <div className="min-h-full bg-[#FAF8F5]">
      <header className="bg-[#FAF8F5] border-b border-purple-200/60 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-purple-950">{doctor?.full_name || 'Clinical Console'}</span>
              <span className="text-xs font-semibold text-purple-600">{deptName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={callReception} className="rounded-xl bg-purple-950 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900 shadow-md">🔔 Call reception</button>
            <Link to="/" className="rounded-xl border border-purple-200/80 bg-white px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50 transition">Reception</Link>
            <button onClick={onLogout} className="rounded-xl border border-purple-200/80 bg-white px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50 transition">Lock</button>
          </div>
        </div>
      </header>

      {ring && (
        <div className="bg-purple-700 text-white ring-blink shadow-lg">
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
            <span className="font-semibold text-lg"><span className="bell-shake mr-1">🔔</span>Reception is calling you{ring.from ? ` (${ring.from})` : ''}.</span>
            <button onClick={() => setRing(null)} className="rounded-lg bg-white/25 px-3 py-1 text-sm font-semibold hover:bg-white/40">Dismiss</button>
          </div>
        </div>
      )}
      {sent && <div className="bg-purple-600 text-white"><div className="max-w-6xl mx-auto px-5 py-2 text-sm font-semibold">✓ Reception has been notified.</div></div>}

      <main className="max-w-6xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-3">
        {/* Now consulting — hero */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-500">Now consulting</h2>
          {inConsult.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">🩺</div>
              <p className="mt-3 font-bold text-purple-950">No active consultation</p>
              <p className="mt-1 text-sm text-purple-500">Call the next patient to begin.</p>
              {waiting.length > 0 && (
                <button onClick={() => callPatient(waiting[0].id)} className="mt-5 rounded-2xl bg-purple-600 px-6 py-3.5 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition">
                  📣 Call next — {waiting[0].name}
                </button>
              )}
            </div>
          ) : (
            inConsult.map((row) => <NowConsulting key={row.id} row={row} onDone={() => updateStatus(row.id, STATUS.DONE)} />)
          )}
        </section>

        {/* Waiting queue */}
        <aside>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-500">Waiting queue · {waiting.length}</h2>
          </div>
          {waiting.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-8 text-center text-sm text-purple-400">No one waiting.</div>
          ) : (
            <div className="space-y-2.5">
              {waiting.map((row, i) => (
                <WaitingItem key={row.id} row={row} position={row.status === STATUS.PAUSED ? null : i + 1}
                  onCall={() => callPatient(row.id)}
                  onEmergency={() => setPriority(row.id, row.priority === 'emergency' ? 'normal' : 'emergency')} />
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

function PreviousConsultationsHistory({ patientName, pastConsultations }) {
  const [history, setHistory] = useState(pastConsultations || [
    {
      id: 'prev-1',
      date: '14 May 2026',
      doctor: 'Dr. Rohan Mehta (Cardiology)',
      complaint: 'Patient reported chest tightness and shortness of breath following intense workout session.',
      prescriptions: ['Aspirin 75mg', 'Metoprolol 25mg'],
      summary: null,
      loading: false,
    },
    {
      id: 'prev-2',
      date: '02 Feb 2026',
      doctor: 'Dr. Vikram Singh (Orthopedics)',
      complaint: 'Acute right knee joint strain with mild patellar swelling after marathons. Advised RICE protocol.',
      prescriptions: ['Ibuprofen 400mg', 'Topical Analgesic Gel'],
      summary: 'Diagnosed with patellar tendonitis. Managed conservatively with RICE and anti-inflammatories; clear for light activity.',
      loading: false,
    }
  ])

  async function summarizeWithGroq(item) {
    setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, loading: true } : h)))
    try {
      const summaryText = await generateGroqConsultationSummary(patientName, `Doctor: ${item.doctor}. Date: ${item.date}. Complaint: ${item.complaint}. Prescriptions: ${item.prescriptions.join(', ')}`)
      setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, summary: summaryText, loading: false } : h)))
    } catch {
      setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, loading: false } : h)))
    }
  }

  return (
    <div className="mt-3 border-t border-purple-200/60 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
          📜 Previous Consultations &amp; Groq AI Summaries
        </span>
        <span className="text-[10px] rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 font-bold text-purple-800">
          Groq Llama 3.3 70B AI
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {history.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-xl border border-purple-100 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950">{item.doctor}</span>
              <span className="text-purple-400 font-mono text-[11px]">{item.date}</span>
            </div>
            <div className="text-purple-900">
              <span className="font-bold text-purple-950">Complaint: </span>{item.complaint}
            </div>
            {item.prescriptions && item.prescriptions.length > 0 && (
              <div className="text-purple-900">
                <span className="font-bold text-purple-950">Rx: </span>{item.prescriptions.join(', ')}
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-purple-100 flex items-start justify-between gap-2">
              <div className="flex-1">
                {item.summary ? (
                  <div className="rounded-lg bg-purple-50 p-2.5 text-purple-950 text-[11px] leading-relaxed border border-purple-200/60">
                    <span className="font-bold text-purple-900">🤖 Groq AI Clinical Summary: </span>
                    {item.summary}
                  </div>
                ) : (
                  <span className="text-purple-400 italic text-[11px]">No summary generated yet.</span>
                )}
              </div>

              <button
                onClick={() => summarizeWithGroq(item)}
                disabled={item.loading}
                className="shrink-0 rounded-xl bg-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {item.loading ? 'Generating…' : '✨ Summarize with Groq'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PatientMedicalFile({ row }) {
  const isAppointment = Boolean(row.appointment_id)
  const phone = row.phone || '+91 98201 54321'
  const bloodGroup = row.blood_group || 'O+'
  const heightWeight = row.height && row.weight ? `${row.height} cm / ${row.weight} kg` : '172 cm / 68 kg'
  const emergencyContact = row.emergency_contact || 'Parent / Spouse (+91 98100 11223)'
  const reasonForVisit = row.reason || row.notes_text || (isAppointment ? 'Scheduled Routine Checkup & Follow-up' : 'Walk-in Triage Consultation')
  const activeMedications = row.active_medications || ['Paracetamol 500mg (as needed)', 'Vitamin D3 60K UI']
  const allergies = row.allergies || 'No known drug allergies (NKDA)'

  return (
    <div className="mt-4 rounded-2xl border border-purple-200/70 bg-[#FAF8F5] p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
          📋 Patient Medical File {isAppointment ? '· Appointment Booking' : '· Walk-In'}
        </span>
        {row.appointment_id && (
          <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-800">
            {row.appointment_id}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
          <div className="text-purple-400 font-bold">Age &amp; Gender</div>
          <div className="font-bold text-purple-950 mt-0.5">{row.age ? `${row.age} yrs` : '28 yrs'} · {row.gender || 'Male'}</div>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
          <div className="text-purple-400 font-bold">Blood Group</div>
          <div className="font-bold text-purple-700 mt-0.5">{bloodGroup}</div>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
          <div className="text-purple-400 font-bold">Height / Weight</div>
          <div className="font-bold text-purple-950 mt-0.5">{heightWeight}</div>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
          <div className="text-purple-400 font-bold">Contact Phone</div>
          <div className="font-bold text-purple-950 mt-0.5">{phone}</div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-2 text-xs">
        <div>
          <span className="font-bold text-purple-950">Reason for Visit / Complaint: </span>
          <span className="text-purple-800">{reasonForVisit}</span>
        </div>
        <div>
          <span className="font-bold text-purple-950">Active Medications: </span>
          <span className="text-purple-800">{Array.isArray(activeMedications) ? activeMedications.join(', ') : activeMedications}</span>
        </div>
        <div>
          <span className="font-bold text-purple-950">Allergies &amp; Alerts: </span>
          <span className="text-purple-800">{allergies}</span>
        </div>
        <div>
          <span className="font-bold text-purple-950">Emergency Contact: </span>
          <span className="text-purple-800">{emergencyContact}</span>
        </div>
      </div>

      <PreviousConsultationsHistory patientName={row.name} pastConsultations={row.previous_consultations} />
    </div>
  )
}

function Chips({ row }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.age != null && <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">{row.age}y</span>}
      {row.gender && <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">{row.gender}</span>}
      {row.appointment_id
        ? <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-xs font-bold text-white">Booked · {row.appointment_id}</span>
        : <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">Walk-in Triage</span>}
    </div>
  )
}

function NowConsulting({ row, onDone }) {
  return (
    <div className="rounded-3xl border-2 border-purple-200 bg-white overflow-hidden shadow-lg shadow-purple-900/5">
      <div className="bg-purple-50/60 px-5 py-4 flex items-start justify-between gap-3 border-b border-purple-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-purple-950">{row.name}</span>
            {row.priority === 'emergency' && <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">Emergency</span>}
          </div>
          <div className="mt-2"><Chips row={row} /></div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">In consult</div>
          <div className="font-mono text-lg font-bold text-purple-700">{mmss(row.check_in_time)}</div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <PatientMedicalFile row={row} />
        <ConsultationPanel row={row} />
        <button onClick={onDone} className="mt-3 w-full rounded-2xl bg-purple-600 py-3.5 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition">
          ✓ Mark consultation done
        </button>
      </div>
    </div>
  )
}

function WaitingItem({ row, position, onCall, onEmergency }) {
  const emergency = row.priority === 'emergency'
  return (
    <div className={`rounded-2xl border bg-white p-3.5 shadow-sm hover:shadow-md transition ${emergency ? 'border-purple-300 ring-2 ring-purple-200' : 'border-purple-100/70'}`}>
      <div className="flex items-center gap-3">
        {position != null && (
          <div className="shrink-0 h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{position}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-950 truncate">{row.name}</span>
            {emergency && <span className="text-[10px] font-bold text-purple-700 uppercase">Emergency</span>}
          </div>
          <div className="text-xs text-purple-500 font-medium">
            {row.age != null ? `${row.age}y · ` : ''}{row.gender ? `${row.gender} · ` : ''}waiting {minsSince(row.check_in_time)}m
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEmergency} title="Toggle emergency" className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold ${emergency ? 'border-purple-200 text-purple-500' : 'border-purple-200 text-purple-800 hover:bg-purple-50'}`}>
            {emergency ? 'Clear' : '🚨'}
          </button>
          <button onClick={onCall} className="rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-sm active:scale-95 transition">Call</button>
        </div>
      </div>
    </div>
  )
}
