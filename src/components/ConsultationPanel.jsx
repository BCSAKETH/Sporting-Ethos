import { useEffect, useRef, useState } from 'react'
import { startRecording, generateNotes, downloadNotesPDF } from '../lib/chart.js'
import { saveNotes } from '../lib/store.js'
import StructuredRx from './StructuredRx.jsx'

const SAMPLE_TRANSCRIPT =
  "Patient reports right knee pain that started three days ago after a long run. " +
  "There's mild swelling and it hurts going down stairs. No locking or giving way. " +
  "I'm advising the RICE protocol, prescribing ibuprofen 400 milligrams twice daily with food, " +
  "and we'll arrange an MRI if it hasn't settled within a week. Referring to physiotherapy."

// Ambient charting for the patient currently in consultation — Ivory & Lavender.
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
    <>
    <div className="mt-3 rounded-2xl border border-purple-200/70 bg-[#FAF8F5] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
          Ambient charting
        </span>
        {notes?.engine && (
          <span className="text-[10px] rounded-full bg-white border border-purple-200/70 px-2.5 py-0.5 font-semibold text-purple-800">
            {notes.engine === 'groq' ? 'Groq AI' : notes.engine}
          </span>
        )}
      </div>

      {phase === 'idle' && (
        <button
          onClick={start}
          className="mt-3 w-full rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition-all"
        >
          ● Start recording consultation
        </button>
      )}

      {phase === 'recording' && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-900">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse" />
            Recording… <span className="font-mono font-bold text-purple-700">{mmss}</span>
          </div>
          <button
            onClick={() => finish(false)}
            className="w-full rounded-xl bg-purple-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 shadow-md active:scale-95 transition-all"
          >
            Stop & generate notes
          </button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-purple-700">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          Transcribing & structuring…
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-purple-700 font-medium">{error}</p>
          <div className="flex gap-2">
            <button onClick={start} className="rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50">
              Retry mic
            </button>
            <button onClick={() => finish(true)} className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm">
              Generate from sample
            </button>
          </div>
        </div>
      )}

      {phase === 'ready' && notes && (
        <div className="mt-3 space-y-3">
          {notes.summary && (
            <p className="text-sm text-purple-950 italic">"{notes.summary}"</p>
          )}
          <NoteList title="Symptoms" items={notes.symptoms} color="text-purple-900" />
          <NoteList title="Prescriptions" items={notes.prescriptions} color="text-purple-800" />
          <NoteList title="Actions & follow-up" items={notes.actions} color="text-purple-700" />

          <div className="flex gap-2 pt-2 border-t border-purple-200/50">
            <button
              onClick={() => downloadNotesPDF(row, notes)}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20 active:scale-95 transition-all"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-50 transition"
            >
              Re-record
            </button>
          </div>
        </div>
      )}
    </div>
    <StructuredRx row={row} />
    </>
  )
}

function NoteList({ title, items, color }) {
  const list = items && items.length ? items : null
  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</div>
      {list ? (
        <ul className="mt-1 space-y-1">
          {list.map((it, i) => (
            <li key={i} className="text-xs text-purple-950 flex gap-2 font-medium">
              <span className="text-purple-400">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-0.5 text-xs text-purple-400">—</p>
      )}
    </div>
  )
}
