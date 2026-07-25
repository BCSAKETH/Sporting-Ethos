import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import ConsultationPanel from '../components/ConsultationPanel.jsx'
import { subscribe, updateStatus, setPriority, sortQueue, isActive, STATUS } from '../lib/store.js'
import { autoPrimeVoice, announce, chime } from '../lib/voice.js'
import { sendIntercom, onIntercom } from '../lib/intercom.js'

const EXPERT_CODE = import.meta.env.VITE_EXPERT_CODE || 'ethos'
const AUTH_KEY = 'ethos_expert_authed'
const minsSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
const mmss = (iso) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Expert() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === '1')
  if (!authed) return <Gate onOk={() => setAuthed(true)} />
  return <Console onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthed(false) }} />
}

function Gate({ onOk }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  function submit(e) {
    e.preventDefault()
    if (code.trim() === EXPERT_CODE) { localStorage.setItem(AUTH_KEY, '1'); onOk() }
    else setErr('Incorrect code.')
  }
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex justify-center mb-4"><Logo /></div>
        <h1 className="text-center text-lg font-semibold text-slate-900">Expert Console</h1>
        <p className="text-center text-sm text-slate-500 mt-1">Enter your access code to continue.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input autoFocus type="password" value={code} onChange={(e) => { setCode(e.target.value); setErr('') }}
            placeholder="Access code"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg text-center tracking-widest focus:border-ethos-green focus:ring-2 focus:ring-emerald-200 outline-none" />
          {err && <p className="text-sm text-red-600 text-center">{err}</p>}
          <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">Enter</button>
        </form>
        <Link to="/" className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600">← Reception dashboard</Link>
      </div>
    </div>
  )
}

function Console({ onLogout }) {
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
  function callReception() { sendIntercom('call_reception', 'Expert'); setSent(true); setTimeout(() => setSent(false), 4000) }

  const waiting = useMemo(() => sortQueue(rows.filter(isActive)), [rows])
  const inConsult = rows.filter((r) => r.status === STATUS.IN_CONSULT)

  return (
    <div className="min-h-full">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Expert Console</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={callReception} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">🔔 Call reception</button>
            <Link to="/" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">Reception</Link>
            <button onClick={onLogout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">Lock</button>
          </div>
        </div>
      </header>

      {ring && (
        <div className="bg-amber-500 text-white ring-blink shadow-lg">
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
            <span className="font-semibold text-lg"><span className="bell-shake mr-1">🔔</span>Reception is calling you{ring.from ? ` (${ring.from})` : ''}.</span>
            <button onClick={() => setRing(null)} className="rounded-lg bg-white/25 px-3 py-1 text-sm font-semibold hover:bg-white/40">Dismiss</button>
          </div>
        </div>
      )}
      {sent && <div className="bg-emerald-600 text-white"><div className="max-w-6xl mx-auto px-5 py-2 text-sm">✓ Reception has been notified.</div></div>}

      <main className="max-w-6xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-3">
        {/* Now consulting — hero */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Now consulting</h2>
          {inConsult.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="text-4xl">🩺</div>
              <p className="mt-3 font-medium text-slate-600">No active consultation</p>
              <p className="mt-1 text-sm text-slate-400">Call the next patient to begin.</p>
              {waiting.length > 0 && (
                <button onClick={() => callPatient(waiting[0].id)} className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 shadow-sm">
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Waiting queue · {waiting.length}</h2>
          </div>
          {waiting.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No one waiting.</div>
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

function Chips({ row }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.age != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{row.age}y</span>}
      {row.gender && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{row.gender}</span>}
      {row.appointment_id
        ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">Booked · {row.appointment_id}</span>
        : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Walk-in</span>}
    </div>
  )
}

function NowConsulting({ row, onDone }) {
  return (
    <div className="rounded-2xl border-2 border-sky-200 bg-white overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-sky-50 to-white px-5 py-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">{row.name}</span>
            {row.priority === 'emergency' && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">Emergency</span>}
          </div>
          <div className="mt-2"><Chips row={row} /></div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-400 uppercase tracking-wider">In consult</div>
          <div className="font-mono text-lg font-semibold text-sky-700">{mmss(row.check_in_time)}</div>
        </div>
      </div>
      <div className="px-5 pb-5">
        <ConsultationPanel row={row} />
        <button onClick={onDone} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">
          ✓ Mark consultation done
        </button>
      </div>
    </div>
  )
}

function WaitingItem({ row, position, onCall, onEmergency }) {
  const emergency = row.priority === 'emergency'
  return (
    <div className={`rounded-xl border bg-white p-3 ${emergency ? 'border-rose-300' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        {position != null && (
          <div className="shrink-0 h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-semibold">{position}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 truncate">{row.name}</span>
            {emergency && <span className="text-[10px] font-bold text-rose-600 uppercase">Emergency</span>}
          </div>
          <div className="text-xs text-slate-500">
            {row.age != null ? `${row.age}y · ` : ''}{row.gender ? `${row.gender} · ` : ''}waiting {minsSince(row.check_in_time)}m
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEmergency} title="Toggle emergency" className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${emergency ? 'border-slate-200 text-slate-500' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}`}>
            {emergency ? 'Clear' : '🚨'}
          </button>
          <button onClick={onCall} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">Call</button>
        </div>
      </div>
    </div>
  )
}
