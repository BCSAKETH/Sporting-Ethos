import { useState } from 'react'
import { savePrescriptions, requiredUnits } from '../lib/store.js'

const TIMINGS = [
  ['morning', 'Morning'],
  ['afternoon', 'Afternoon'],
  ['evening', 'Evening'],
  ['night', 'Night'],
]

function blankDraft() {
  return {
    medicine_name: '',
    dosage: 1,
    duration_days: 5,
    route: 'Oral',
    before_after_food: 'After food',
    timing: { morning: true, afternoon: false, evening: false, night: true },
    special_instructions: '',
  }
}

// Doctor's structured prescription intake — saved to checkins.prescriptions so
// the pharmacy can run exact dosage math (Dosage × Frequency × Duration).
export default function StructuredRx({ row }) {
  const [items, setItems] = useState(Array.isArray(row.prescriptions) ? row.prescriptions : [])
  const [draft, setDraft] = useState(blankDraft())
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const freqOf = (d) => TIMINGS.filter(([k]) => d.timing[k]).length || 1

  function addItem() {
    if (!draft.medicine_name.trim()) return
    const item = { ...draft, medicine_name: draft.medicine_name.trim(), frequency: freqOf(draft) }
    setItems((prev) => [...prev, item])
    setDraft(blankDraft())
    setSaved(false)
  }
  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }
  function toggleTiming(k) {
    setDraft((d) => ({ ...d, timing: { ...d.timing, [k]: !d.timing[k] } }))
  }

  async function save() {
    setBusy(true)
    try {
      await savePrescriptions(row.id, items)
      setSaved(true)
    } catch (e) {
      console.error('savePrescriptions failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-purple-200/70 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">💊 Structured Prescription (e-Rx)</span>
        {items.length > 0 && (
          <button onClick={save} disabled={busy} className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
            {busy ? 'Saving…' : saved ? '✓ Sent to Pharmacy' : `Send ${items.length} to Pharmacy`}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-purple-950">{it.medicine_name}</div>
                  <div className="text-[11px] text-purple-700 mt-0.5">
                    {it.dosage} unit × {it.frequency}/day × {it.duration_days}d ·{' '}
                    <b>{requiredUnits(it)} units</b> · {it.route} · {it.before_after_food}
                  </div>
                  <div className="text-[11px] text-purple-600 mt-0.5">
                    {TIMINGS.filter(([k]) => it.timing?.[k]).map(([, l]) => l).join(' • ') || '—'}
                    {it.special_instructions ? ` · ${it.special_instructions}` : ''}
                  </div>
                </div>
                <button onClick={() => removeItem(i)} className="text-purple-300 hover:text-rose-500 font-bold text-base px-1">×</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add row */}
      <div className="mt-3 space-y-2 border-t border-purple-100 pt-3">
        <input
          value={draft.medicine_name}
          onChange={(e) => setDraft((d) => ({ ...d, medicine_name: e.target.value }))}
          placeholder="Medicine name (e.g. Paracetamol 500mg)"
          className="input w-full text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-semibold text-purple-700">
            Dosage / take
            <input type="number" min="1" value={draft.dosage} onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))} className="input w-full mt-0.5 text-sm" />
          </label>
          <label className="text-[11px] font-semibold text-purple-700">
            Duration (days)
            <input type="number" min="1" value={draft.duration_days} onChange={(e) => setDraft((d) => ({ ...d, duration_days: e.target.value }))} className="input w-full mt-0.5 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TIMINGS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleTiming(k)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                draft.timing[k] ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
              }`}
            >
              {label} {draft.timing[k] ? '✔' : ''}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={draft.route} onChange={(e) => setDraft((d) => ({ ...d, route: e.target.value }))} className="input w-full text-sm">
            {['Oral', 'Topical', 'IV', 'IM', 'Inhaled', 'Drops'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <select value={draft.before_after_food} onChange={(e) => setDraft((d) => ({ ...d, before_after_food: e.target.value }))} className="input w-full text-sm">
            {['After food', 'Before food', 'With food', 'Empty stomach', 'Anytime'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <input
          value={draft.special_instructions}
          onChange={(e) => setDraft((d) => ({ ...d, special_instructions: e.target.value }))}
          placeholder="Special instructions (optional)"
          className="input w-full text-sm"
        />
        <button onClick={addItem} disabled={!draft.medicine_name.trim()} className="w-full rounded-xl border border-purple-300 bg-purple-50 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 disabled:opacity-50">
          + Add medicine
        </button>
      </div>
    </div>
  )
}
