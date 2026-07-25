import { useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Receipt from '../components/Receipt.jsx'
import { createCheckin, subscribe, sortQueue, isActive, STATUS } from '../lib/store.js'
import { autoPrimeVoice, announce, chime } from '../lib/voice.js'
import { LANGS, tFor, voiceFor } from '../lib/i18n.js'

const AVG_MINUTES = 8

export default function PatientCheckIn() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkin, setCheckin] = useState(null)
  const [queue, setQueue] = useState([])
  const [lang, setLang] = useState(() => localStorage.getItem('ethos_lang') || 'en')
  const [assist, setAssist] = useState(() => localStorage.getItem('ethos_a11y') === '1')
  const t = tFor(lang)

  useEffect(() => autoPrimeVoice(), [])
  useEffect(() => localStorage.setItem('ethos_lang', lang), [lang])
  useEffect(() => localStorage.setItem('ethos_a11y', assist ? '1' : '0'), [assist])
  // Voice-guided: read the welcome aloud when assist mode is on / language changes.
  useEffect(() => {
    if (assist && !checkin) announce(`${t('welcome')}. ${t('intro')}`, voiceFor(lang))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assist, lang])

  useEffect(() => {
    if (!checkin) return
    const unsub = subscribe((rows) => setQueue(rows))
    return unsub
  }, [checkin])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError(t('enterName'))
    setBusy(true)
    try {
      const row = await createCheckin({ name: name.trim(), gender: gender || null, age: age || null })
      setCheckin(row)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again or see reception.')
    } finally {
      setBusy(false)
    }
  }

  const genderKey = { Male: 'male', Female: 'female', Other: 'other' }

  return (
    <div style={{ zoom: assist ? 1.15 : 1 }} className="min-h-full flex flex-col">
      <header className="px-5 py-4 flex items-center justify-between gap-2">
        <Logo />
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-white/70 border border-slate-200 p-0.5">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${lang === l.code ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={() => setAssist((a) => !a)} title="Large text + voice guide"
            className={`rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${assist ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            🔊 A+
          </button>
        </div>
      </header>

      {checkin ? (
        <Confirmation checkin={checkin} queue={queue} t={t} lang={lang} />
      ) : (
        <main className="flex-1 px-5 pb-10 max-w-md w-full mx-auto flex flex-col justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('welcome')}</h1>
            <p className="mt-2 text-slate-500">{t('intro')}</p>
          </div>

          <form onSubmit={submit} className="mt-7 card p-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">{t('fullName')}</span>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="—" className="input" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">{t('age')} <span className="text-slate-400 font-normal">{t('optional')}</span></span>
                <input value={age} inputMode="numeric" onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="34" className="input" />
              </label>
              <div>
                <span className="text-sm font-medium text-slate-600">{t('gender')} <span className="text-slate-400 font-normal">{t('optional')}</span></span>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button key={g} type="button" onClick={() => setGender(gender === g ? '' : g)}
                      className={`rounded-xl border px-1 py-3.5 text-sm font-medium transition active:scale-95 ${gender === g ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                      {t(genderKey[g])}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={busy}
              className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.99] transition disabled:opacity-60">
              {busy ? t('checkingIn') : t('checkin')}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">🔒 {t('privacy')}</p>
        </main>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
function Confirmation({ checkin, queue, t, lang }) {
  const live = queue.find((r) => r.id === checkin.id) || checkin
  const activeQueue = sortQueue(queue.filter(isActive))
  const idx = activeQueue.findIndex((r) => r.id === checkin.id)
  const position = idx >= 0 ? idx + 1 : null
  const eta = position ? Math.max(0, (position - 1) * AVG_MINUTES) : null

  const yourTurn = live.status === STATUS.IN_CONSULT
  const done = live.status === STATUS.DONE
  const removed = live.status === STATUS.LEFT || live.status === STATUS.NO_SHOW

  const wasYourTurn = useRef(false)
  useEffect(() => {
    if (yourTurn && !wasYourTurn.current) {
      chime()
      announce(`${checkin.name}, ${t('turnAnnounce')}`, voiceFor(lang))
    }
    wasYourTurn.current = yourTurn
  }, [yourTurn, checkin.name, t, lang])

  return (
    <main className="flex-1 px-5 pb-10 max-w-md w-full mx-auto">
      {yourTurn ? (
        <HeroCard tone="turn" emoji="🔔" title={t('yourTurn')} sub={t('proceed')} pulse />
      ) : done ? (
        <HeroCard tone="done" emoji="✅" title={t('complete')} sub={t('thanks')} />
      ) : removed ? (
        <HeroCard tone="left" emoji="ℹ️" title="You've left the queue" sub="Please see reception if this is a mistake." />
      ) : (
        <CheckedInHero name={checkin.name} position={position} eta={eta} t={t} />
      )}

      {live.notes && (done || yourTurn) && <VisitSummary notes={live.notes} t={t} />}

      <details className="mt-5 group">
        <summary className="cursor-pointer list-none text-sm font-medium text-slate-500 flex items-center gap-2 select-none">
          <span className="transition group-open:rotate-90">▸</span> {t('receipt')}
        </summary>
        <div className="mt-3">
          <Receipt checkin={checkin} position={position || undefined} eta={eta != null ? `~${eta} ${t('minutes')}` : undefined} />
        </div>
      </details>

      <p className="mt-5 text-center text-xs text-slate-400">{t('liveNote')}</p>
    </main>
  )
}

function CheckedInHero({ name, position, eta, t }) {
  return (
    <div className="card p-7 text-center animate-pop">
      <div className="mx-auto h-20 w-20 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{t('checkedIn')}</h1>
      <p className="text-slate-500">{name}</p>
      {position ? (
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full border-4 border-emerald-500 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-emerald-700 tabular-nums">{position}</span>
            </div>
            <div className="mt-1.5 text-xs uppercase tracking-wider text-slate-400">{t('inQueue')}</div>
          </div>
          <div className="text-left">
            <div className="text-3xl font-bold text-slate-900 tabular-nums">~{eta}<span className="text-lg font-medium text-slate-400"> {t('minutes')}</span></div>
            <div className="text-xs uppercase tracking-wider text-slate-400">{t('estWait')}</div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-slate-500">{t('notified')}</p>
      )}
    </div>
  )
}

function HeroCard({ tone, emoji, title, sub, pulse }) {
  const tones = {
    turn: 'bg-emerald-600 text-white shadow-emerald-600/30',
    done: 'bg-slate-800 text-white shadow-slate-800/20',
    left: 'bg-amber-500 text-white shadow-amber-500/20',
  }
  return (
    <div className={`rounded-3xl p-8 text-center shadow-xl animate-pop ${tones[tone]} ${pulse ? 'ring-blink' : ''}`}>
      <div className="text-6xl">{emoji}</div>
      <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 opacity-90">{sub}</p>
    </div>
  )
}

function VisitSummary({ notes, t }) {
  const Section = ({ title, items }) =>
    items && items.length ? (
      <div className="mt-2">
        <div className="text-xs font-semibold text-emerald-700">{title}</div>
        <ul className="mt-0.5 space-y-0.5">
          {items.map((it, i) => (<li key={i} className="text-sm text-slate-700 flex gap-2"><span className="text-slate-300">•</span><span>{it}</span></li>))}
        </ul>
      </div>
    ) : null
  return (
    <div className="mt-5 card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{t('summary')}</h2>
      {notes.summary && <p className="mt-2 text-sm italic text-slate-700">"{notes.summary}"</p>}
      <Section title="Symptoms" items={notes.symptoms} />
      <Section title="Prescriptions" items={notes.prescriptions} />
      <Section title="Actions & follow-up" items={notes.actions} />
      <p className="mt-3 text-[11px] text-slate-400">Auto-generated from your consultation. Please confirm details with your clinician.</p>
    </div>
  )
}
