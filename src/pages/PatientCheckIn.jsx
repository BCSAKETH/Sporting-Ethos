import { useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Receipt from '../components/Receipt.jsx'
import AppBanner from '../components/AppBanner.jsx'
import DatePickerModal from '../components/DatePickerModal.jsx'
import SpeechInput from '../components/SpeechInput.jsx'
import { createCheckin, listDepartments, subscribe, sortQueue, isActive, STATUS } from '../lib/store.js'
import { autoPrimeVoice, announce, chime } from '../lib/voice.js'
import { LANGS, tFor, voiceFor } from '../lib/i18n.js'

const AVG_MINUTES = 8

export default function PatientCheckIn() {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Medical onboarding fields with Speech-to-Text capability
  const [allergies, setAllergies] = useState('')
  const [medications, setMedications] = useState('')
  const [onboardingMedications, setOnboardingMedications] = useState('')

  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState([])
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
  useEffect(() => { listDepartments().then(setDepartments).catch(console.error) }, [])
  
  useEffect(() => {
    if (assist && !checkin) announce(`${t('welcome')}. ${t('intro')}`, voiceFor(lang))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assist, lang])

  useEffect(() => {
    if (!checkin) return
    const unsub = subscribe((rows) => setQueue(rows))
    return unsub
  }, [checkin])

  const handleFocusScroll = (e) => {
    if (e && e.target) {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError(t('enterName'))
    setBusy(true)
    try {
      const row = await createCheckin({
        name: name.trim(),
        gender: gender || null,
        age: age || null,
        date_of_birth: dateOfBirth || null,
        allergies: allergies.trim() || null,
        medications: medications.trim() || null,
        onboarding_medications: onboardingMedications.trim() || null,
        department_id: departmentId || null,
      })
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
    <div style={{ zoom: assist ? 1.15 : 1 }} className="min-h-full flex flex-col bg-[#FAF8F5]">
      {/* Smart App Banner for Mobile Browsers */}
      <AppBanner />

      <header className="px-5 py-4 flex items-center justify-between gap-2 bg-[#FAF8F5] border-b border-purple-100/60">
        <Logo />
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-purple-50/80 border border-purple-200/50 p-0.5">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${lang === l.code ? 'bg-purple-600 text-white' : 'text-purple-800 hover:bg-purple-100/60'}`}>
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={() => setAssist((a) => !a)} title="Large text + voice guide"
            className={`rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${assist ? 'border-purple-500 bg-purple-100 text-purple-800' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}`}>
            🔊 A+
          </button>
        </div>
      </header>

      {checkin ? (
        <Confirmation checkin={checkin} queue={queue} t={t} lang={lang} />
      ) : (
        <main className="flex-1 px-5 pt-6 pb-44 max-w-lg w-full mx-auto flex flex-col justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-purple-950">{t('welcome')}</h1>
            <p className="mt-2 text-purple-700/80">{t('intro')}</p>
          </div>

          <form onSubmit={submit} className="mt-6 card p-6 space-y-5 bg-white rounded-3xl border border-purple-100/70 shadow-lg shadow-purple-900/5">
            {/* Full Name */}
            <label className="block">
              <span className="text-sm font-medium text-purple-950">{t('fullName')} *</span>
              <input
                autoFocus
                value={name}
                onFocus={handleFocusScroll}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="input mt-1 w-full"
              />
            </label>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-purple-950">{t('age')} <span className="text-purple-400 font-normal">{t('optional')}</span></span>
                <input
                  value={age}
                  inputMode="numeric"
                  onFocus={handleFocusScroll}
                  onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                  placeholder="34"
                  className="input mt-1 w-full"
                />
              </label>
              <div>
                <span className="text-sm font-medium text-purple-950">{t('gender')} <span className="text-purple-400 font-normal">{t('optional')}</span></span>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button key={g} type="button" onClick={() => setGender(gender === g ? '' : g)}
                      className={`rounded-xl border px-1 py-3 text-xs font-semibold transition active:scale-95 ${gender === g ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm' : 'border-purple-200/70 text-purple-700 hover:bg-purple-50'}`}>
                      {t(genderKey[g])}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date of Birth Pop-out Calendar Picker */}
            <div>
              <span className="text-sm font-medium text-purple-950">Date of Birth (DOB) <span className="text-purple-400 font-normal">{t('optional')}</span></span>
              <div className="mt-1 relative">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full rounded-xl border border-purple-200/70 px-4 py-3.5 text-left text-sm font-medium text-purple-950 bg-white hover:bg-purple-50/50 flex items-center justify-between transition"
                >
                  <span className={dateOfBirth ? 'text-purple-950 font-semibold' : 'text-purple-300'}>
                    {dateOfBirth ? dateOfBirth : 'Select DOB from calendar'}
                  </span>
                  <span className="text-purple-500">📅</span>
                </button>
              </div>
            </div>

            {/* Allergies with Speech-to-Text Mic */}
            <div>
              <SpeechInput
                label="Known Allergies (Click 🎙️ for voice input)"
                placeholder="e.g. Penicillin, Peanuts, Pollen"
                value={allergies}
                onChange={setAllergies}
                onFocus={handleFocusScroll}
              />
            </div>

            {/* Current Medications with Speech-to-Text Mic */}
            <div>
              <SpeechInput
                label="Current Medications (Click 🎙️ for voice input)"
                placeholder="e.g. Lisinopril 10mg daily, Metformin"
                value={medications}
                onChange={setMedications}
                onFocus={handleFocusScroll}
              />
            </div>

            {/* Medications to be taken during onboarding */}
            <div>
              <SpeechInput
                label="Medications to be taken during onboarding (Click 🎙️ for voice input)"
                placeholder="e.g. Paracetamol prior to consultation"
                value={onboardingMedications}
                onChange={setOnboardingMedications}
                multiline
                rows={2}
                onFocus={handleFocusScroll}
              />
            </div>

            {/* Department */}
            {departments.length > 0 && (
              <label className="block">
                <span className="text-sm font-medium text-purple-950">Department <span className="text-purple-400 font-normal">{t('optional')}</span></span>
                <select
                  value={departmentId}
                  onFocus={handleFocusScroll}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="input mt-1 w-full"
                >
                  <option value="">General / Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            )}

            {error && <p className="text-sm text-purple-600 font-medium">{error}</p>}

            <button type="submit" disabled={busy}
              className="w-full rounded-2xl bg-purple-600 py-4 text-lg font-semibold text-white shadow-lg shadow-purple-600/25 hover:bg-purple-700 active:scale-[0.99] transition disabled:opacity-60">
              {busy ? t('checkingIn') : t('checkin')}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-purple-400">🔒 {t('privacy')}</p>
        </main>
      )}

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        value={dateOfBirth}
        onChange={setDateOfBirth}
        onClose={() => setShowDatePicker(false)}
      />
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
    <main className="flex-1 px-5 pt-6 pb-20 max-w-md w-full mx-auto">
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
        <summary className="cursor-pointer list-none text-sm font-medium text-purple-700 flex items-center gap-2 select-none">
          <span className="transition group-open:rotate-90">▸</span> {t('receipt')}
        </summary>
        <div className="mt-3">
          <Receipt checkin={checkin} position={position || undefined} eta={eta != null ? `~${eta} ${t('minutes')}` : undefined} />
        </div>
      </details>

      <p className="mt-5 text-center text-xs text-purple-400">{t('liveNote')}</p>
    </main>
  )
}

function CheckedInHero({ name, position, eta, t }) {
  return (
    <div className="card p-7 text-center animate-pop bg-white rounded-3xl shadow-xl border border-purple-100/70">
      <div className="mx-auto h-20 w-20 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-purple-950">{t('checkedIn')}</h1>
      <p className="text-purple-700">{name}</p>
      {position ? (
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full border-4 border-purple-500 flex items-center justify-center">
              <span className="text-3xl font-extrabold text-purple-700 tabular-nums">{position}</span>
            </div>
            <div className="mt-1.5 text-xs uppercase tracking-wider text-purple-400">{t('inQueue')}</div>
          </div>
          <div className="text-left">
            <div className="text-3xl font-bold text-purple-950 tabular-nums">~{eta}<span className="text-lg font-medium text-purple-400"> {t('minutes')}</span></div>
            <div className="text-xs uppercase tracking-wider text-purple-400">{t('estWait')}</div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-purple-600">{t('notified')}</p>
      )}
    </div>
  )
}

function HeroCard({ tone, emoji, title, sub, pulse }) {
  const tones = {
    turn: 'bg-purple-600 text-white shadow-purple-600/30',
    done: 'bg-purple-950 text-white shadow-purple-950/20',
    left: 'bg-purple-400 text-white shadow-purple-400/20',
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
        <div className="text-xs font-semibold text-purple-700">{title}</div>
        <ul className="mt-0.5 space-y-0.5">
          {items.map((it, i) => (<li key={i} className="text-sm text-purple-900 flex gap-2"><span className="text-purple-300">•</span><span>{it}</span></li>))}
        </ul>
      </div>
    ) : null
  return (
    <div className="mt-5 card p-5 bg-white rounded-2xl border border-purple-100 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-purple-400">{t('summary')}</h2>
      {notes.summary && <p className="mt-2 text-sm italic text-purple-800">"{notes.summary}"</p>}
      <Section title="Symptoms" items={notes.symptoms} />
      <Section title="Prescriptions" items={notes.prescriptions} />
      <Section title="Actions & follow-up" items={notes.actions} />
      <p className="mt-3 text-[11px] text-purple-400">Auto-generated from your consultation. Please confirm details with your clinician.</p>
    </div>
  )
}
