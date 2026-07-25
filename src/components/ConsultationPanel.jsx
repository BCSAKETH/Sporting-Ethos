import { useEffect, useRef, useState } from 'react'
import { startRecording, generateNotes, downloadNotesPDF } from '../lib/chart.js'
import { saveNotes } from '../lib/store.js'

const SAMPLE_TRANSCRIPT =
  "Patient reports right knee pain that started three days ago after a long run. " +
  "There's mild swelling and it hurts going down stairs. No locking or giving way. " +
  "I'm advising the RICE protocol, prescribing ibuprofen 400 milligrams twice daily with food, " +
  "and we'll arrange an MRI if it hasn't settled within a week. Referring to physiotherapy."

// Ambient charting for the patient currently in consultation.
export default function ConsultationPanel({ row }) {
  const [phase, setPhase] = useState(row.notes ? 'ready' : 'idle') // idle|recording|processing|ready|error
  const [notes, setNotes] = useState(row.notes || null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef(null)

  useEffect(() => {
    if (phase !== 'recording') return
    setElapsed(0)
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  async function start() {
    setError('')
    try {
      recorderRef.current = await startRecording()
      setPhase('recording')
    } catch (e) {
      setError(`Mic unavailable (${e.message}). You can still generate from a sample.`)
      setPhase('error')
    }
  }

  async function finish(fromSample = false) {
    setPhase('processing')
    try {
      let result
      if (fromSample) {
        result = await generateNotes({ transcript: SAMPLE_TRANSCRIPT })
      } else {
        const blob = await recorderRef.current.stop()
        result = await generateNotes({ audioBlob: blob })
      }
      setNotes(result)
      setPhase('ready')
      saveNotes(row.id, result).catch((e) => console.warn('saveNotes failed', e))
    } catch (e) {
      setError(e.message || 'Failed to generate notes')
      setPhase('error')
    }
  }

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ambient charting
        </span>
        {notes?.engine && (
          <span className="text-[10px] rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-500">
            {notes.engine === 'groq' ? 'Groq AI' : notes.engine}
          </span>
        )}
      </div>

      {phase === 'idle' && (
        <button
          onClick={start}
          className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          ● Start recording consultation
        </button>
      )}

      {phase === 'recording' && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            Recording… <span className="font-mono">{mmss}</span>
          </div>
          <button
            onClick={() => finish(false)}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Stop & generate notes
          </button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <span className="h-3 w-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          Transcribing & structuring…
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-600">{error}</p>
          <div className="flex gap-2">
            <button onClick={start} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Retry mic
            </button>
            <button onClick={() => finish(true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Generate from sample
            </button>
          </div>
        </div>
      )}

      {phase === 'ready' && notes && (
        <div className="mt-2 space-y-3">
          {notes.summary && (
            <p className="text-sm text-slate-700 italic">"{notes.summary}"</p>
          )}
          <NoteList title="Symptoms" items={notes.symptoms} color="text-amber-700" />
          <NoteList title="Prescriptions" items={notes.prescriptions} color="text-sky-700" />
          <NoteList title="Actions & follow-up" items={notes.actions} color="text-emerald-700" />

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => downloadNotesPDF(row, notes)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Re-record
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NoteList({ title, items, color }) {
  const list = items && items.length ? items : null
  return (
    <div>
      <div className={`text-xs font-semibold ${color}`}>{title}</div>
      {list ? (
        <ul className="mt-1 space-y-0.5">
          {list.map((it, i) => (
            <li key={i} className="text-sm text-slate-700 flex gap-2">
              <span className="text-slate-300">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-0.5 text-sm text-slate-400">—</p>
      )}
    </div>
  )
}
