import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Logo from '../components/Logo.jsx'
import MetricsStrip from '../components/MetricsStrip.jsx'
import QueueCard from '../components/QueueCard.jsx'
import ReportsPanel from '../components/ReportsPanel.jsx'
import {
  subscribe,
  updateStatus,
  setPriority,
  resetAll,
  sortQueue,
  isActive,
  STATUS,
  backendMode,
  createCheckin,
} from '../lib/store.js'
import { autoPrimeVoice, announce, chime } from '../lib/voice.js'
import { sendIntercom, onIntercom } from '../lib/intercom.js'
import { Link } from 'react-router-dom'

const AVG_MINUTES = 8

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [tab, setTab] = useState('queue') // 'queue' | 'settings'
  const [lastLatency, setLastLatency] = useState(null)
  const [flashIds, setFlashIds] = useState(new Set())
  const [, forceTick] = useState(0)

  const seenIds = useRef(null)

  const [ring, setRing] = useState(null) // incoming intercom from the expert
  const [sent, setSent] = useState(false) // "expert notified" toast

  // Sound is always on — just prime the audio engine on first interaction.
  useEffect(() => {
    autoPrimeVoice()
  }, [])

  // Listen for expert → reception calls.
  useEffect(() =>
    onIntercom((msg) => {
      if (msg.type === 'call_reception') {
        setRing(msg)
        chime()
        announce('The expert is calling reception')
        setTimeout(() => setRing(null), 12000)
      }
    }), [])

  function callExpert() {
    sendIntercom('call_expert', 'Reception')
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  const [showAdd, setShowAdd] = useState(false)

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
          const newest = fresh[fresh.length - 1]
          setLastLatency(Date.now() - new Date(newest.check_in_time).getTime())
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
          fresh.forEach((r) => announce(`${r.name} has arrived`))
          chime()
        }
      }
      setRows(next)
    })
    return unsub
  }, [])

  async function handleReset() {
    if (!confirm('Clear the whole queue? (demo reset)')) return
    await resetAll()
    seenIds.current = null
    setLastLatency(null)
  }

  // Wrap status changes so calling the next patient is audible on this screen too.
  function changeStatus(id, status) {
    if (status === STATUS.IN_CONSULT) {
      const r = rows.find((x) => x.id === id)
      if (r) {
        chime()
        announce(`Calling ${r.name}`)
      }
    }
    updateStatus(id, status)
  }

  const activeQueue = useMemo(() => sortQueue(rows.filter(isActive)), [rows])
  const inConsult = rows.filter((r) => r.status === STATUS.IN_CONSULT)
  const finished = rows.filter(
    (r) => r.status === STATUS.DONE || r.status === STATUS.LEFT || r.status === STATUS.NO_SHOW
  )
  const metrics = {
    waiting: rows.filter((r) => r.status === STATUS.WAITING || r.status === STATUS.PAUSED).length,
    inConsult: inConsult.length,
    done: rows.filter((r) => r.status === STATUS.DONE).length,
    lwbs: rows.filter((r) => r.status === STATUS.LEFT).length,
    noShow: rows.filter((r) => r.status === STATUS.NO_SHOW).length,
    lastLatencyMs: lastLatency,
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <LiveBadge />
          </div>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <TabBtn active={tab === 'queue'} onClick={() => setTab('queue')}>
              Live Queue
            </TabBtn>
            <TabBtn active={tab === 'reports'} onClick={() => setTab('reports')}>
              Reports
            </TabBtn>
            <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>
              Settings
            </TabBtn>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              ＋ Add patient
            </button>
            <button
              onClick={callExpert}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              🔔 Call expert
            </button>
            <Link
              to="/expert"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Expert
            </Link>
            <Link
              to="/pharmacy"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Pharmacy
            </Link>
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {ring && (
        <div className="bg-amber-500 text-white ring-blink shadow-lg">
          <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
            <span className="font-semibold text-lg">
              <span className="bell-shake mr-1">🔔</span>
              The expert is calling reception{ring.from ? ` (${ring.from})` : ''}.
            </span>
            <button onClick={() => setRing(null)} className="rounded-lg bg-white/25 px-3 py-1 text-sm font-semibold hover:bg-white/40">Dismiss</button>
          </div>
        </div>
      )}
      {sent && (
        <div className="bg-emerald-600 text-white">
          <div className="max-w-6xl mx-auto px-5 py-2 text-sm">✓ The expert has been notified.</div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === 'queue' ? (
          <div className="fade-up">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Live Queue</h1>
                <p className="text-sm text-slate-400">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <MetricsStrip {...metrics} />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* Waiting queue */}
              <section className="lg:col-span-2">
                <SectionTitle>Waiting queue · {activeQueue.length}</SectionTitle>
                {activeQueue.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-3">
                    {activeQueue.map((row, i) => (
                      <div key={row.id} className="fade-up">
                        <QueueCard
                          row={row}
                          position={row.status === STATUS.PAUSED ? null : i + 1}
                          isNew={flashIds.has(row.id)}
                          eta={`${Math.max(0, i * AVG_MINUTES)} min`}
                          onStatus={changeStatus}
                          onPriority={setPriority}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Side column */}
              <aside className="space-y-6">
                <section>
                  <SectionTitle>In consultation · {inConsult.length}</SectionTitle>
                  {inConsult.length === 0 ? (
                    <Muted>No one in consultation.</Muted>
                  ) : (
                    <div className="space-y-3">
                      {inConsult.map((row) => (
                        <QueueCard key={row.id} row={row} onStatus={changeStatus} onPriority={setPriority} />
                      ))}
                    </div>
                  )}
                  {inConsult.length > 0 && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Consultation recording &amp; charting happens in the{' '}
                      <a href="/expert" className="text-emerald-600 hover:underline">Expert Console</a>.
                    </p>
                  )}
                </section>
                <section>
                  <SectionTitle>Completed & left · {finished.length}</SectionTitle>
                  {finished.length === 0 ? (
                    <Muted>Nothing yet.</Muted>
                  ) : (
                    <div className="space-y-2">
                      {finished
                        .slice()
                        .reverse()
                        .map((row) => (
                          <QueueCard key={row.id} row={row} onStatus={changeStatus} onPriority={setPriority} />
                        ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        ) : tab === 'reports' ? (
          <div className="fade-up">
            <ReportsPanel />
          </div>
        ) : (
          <div className="fade-up">
            <SettingsTab />
          </div>
        )}
      </main>

      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reception: add / book a patient directly                            */
/* ------------------------------------------------------------------ */
function AddPatientModal({ onClose }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Enter a name.')
    setBusy(true)
    try {
      await createCheckin({ name: name.trim(), age: age || null, gender: gender || null, source: 'reception' })
      onClose()
    } catch (e2) {
      console.error(e2)
      setErr('Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add patient (walk-in)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Register a patient at the desk. A sequential appointment ID is assigned automatically.</p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="Full name" className="input" />
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
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Adding…' : 'Add patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Settings tab — download the universal check-in QR                   */
/* ------------------------------------------------------------------ */
function SettingsTab() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const checkinUrl = `${origin}/checkin`
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin)
  const [copied, setCopied] = useState(false)

  function downloadQR() {
    const canvas = document.getElementById('qr-hires')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'sporting-ethos-checkin-qr.png'
    a.click()
  }
  function copyUrl() {
    navigator.clipboard?.writeText(checkinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Universal check-in QR</h2>
        <p className="mt-1 text-sm text-slate-500">
          Download this and print it (or show it on a screen) at your reception. Every patient
          scans the same code to check in.
        </p>

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-2xl border border-slate-200 p-4 shadow-sm bg-white">
            <QRCodeCanvas value={checkinUrl} size={200} includeMargin level="M" />
          </div>
          <div style={{ display: 'none' }}>
            <QRCodeCanvas id="qr-hires" value={checkinUrl} size={1024} includeMargin level="M" />
          </div>
          <code className="mt-3 text-xs text-slate-400 break-all text-center">{checkinUrl}</code>
          <div className="mt-4 flex w-full gap-2">
            <button onClick={downloadQR} className="flex-1 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
              Download QR (PNG)
            </button>
            <button onClick={copyUrl} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">How to use it</h2>
        <ol className="mt-3 space-y-3 text-sm text-slate-600">
          <Step n="1">Place the QR where patients arrive — a printed poster, tablet, or reception screen.</Step>
          <Step n="2">A patient scans it, enters their name (+ appointment ID if they have one), and taps check in.</Step>
          <Step n="3">They appear on the live queue instantly — with a highlight, a chime, and a voice announcement.</Step>
        </ol>

        {isLocalhost ? (
          <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
            <b>Heads up:</b> you're viewing this at <code>localhost</code>, so the QR points to
            localhost and won't open on a phone. Open this dashboard using your computer's network
            address (e.g. <code>http://192.168.x.x:5173</code>) and download the QR again.
          </div>
        ) : (
          <div className="mt-5 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
            This QR points to <code>{checkinUrl}</code> — phones on the same Wi-Fi can scan it.
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small UI atoms                                                      */
/* ------------------------------------------------------------------ */
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function LiveBadge() {
  const supa = backendMode === 'supabase'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <span className={`h-1.5 w-1.5 rounded-full ${supa ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {supa ? 'Live' : 'Local demo'}
    </span>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{children}</h2>
  )
}
function Muted({ children }) {
  return <p className="text-sm text-slate-400">{children}</p>
}
function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <p className="font-medium text-slate-600">The waiting room is empty</p>
      <p className="mt-1 text-sm text-slate-400">
        New check-ins appear here instantly — with a highlight, a chime, and a voice announcement.
      </p>
    </div>
  )
}
