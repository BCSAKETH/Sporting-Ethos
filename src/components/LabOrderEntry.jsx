import { useState } from 'react'
import { createLabOrders } from '../lib/store.js'

const COMMON_TESTS = [
  'Complete Blood Count (CBC)',
  'Blood Sugar (Fasting)',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Thyroid Profile (TSH)',
  'Urine Routine',
  'X-Ray Chest',
  'ECG',
  'Ultrasound Abdomen',
  'HbA1c',
  'Vitamin D',
]

// Doctor orders diagnostic lab tests during consultation → lab_orders (pending).
export default function LabOrderEntry({ row }) {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [prep, setPrep] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  function add() {
    if (!name.trim()) return
    setItems((p) => [...p, { test_name: name.trim(), prep_instructions: prep.trim() || null }])
    setName('')
    setPrep('')
    setSaved(false)
  }
  function remove(i) {
    setItems((p) => p.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  async function save() {
    setBusy(true)
    try {
      await createLabOrders(
        items.map((it) => ({
          checkin_id: row.id,
          appointment_id: row.appointment_id ?? null,
          patient_id: row.patient_id ?? null,
          patient_name: row.name,
          test_name: it.test_name,
          prep_instructions: it.prep_instructions,
          status: 'pending',
        })),
      )
      setSaved(true)
    } catch (e) {
      console.error('createLabOrders failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-purple-200/70 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">🧪 Lab Tests Ordered</span>
        {items.length > 0 && (
          <button onClick={save} disabled={busy} className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
            {busy ? 'Saving…' : saved ? '✓ Sent to Patient App' : `Order ${items.length} test(s)`}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-xl border border-purple-100 bg-purple-50/40 p-2.5">
              <div>
                <div className="text-sm font-bold text-purple-950">{it.test_name}</div>
                {it.prep_instructions && <div className="text-[11px] text-purple-600">Prep: {it.prep_instructions}</div>}
              </div>
              <button onClick={() => remove(i)} className="text-purple-300 hover:text-rose-500 font-bold text-base px-1">×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2 border-t border-purple-100 pt-3">
        <input
          list="common-tests"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Test name (e.g. CBC, Lipid Profile)"
          className="input w-full text-sm"
        />
        <datalist id="common-tests">
          {COMMON_TESTS.map((t) => <option key={t} value={t} />)}
        </datalist>
        <input value={prep} onChange={(e) => setPrep(e.target.value)} placeholder="Prep instructions (optional, e.g. 12h fasting)" className="input w-full text-sm" />
        <button onClick={add} disabled={!name.trim()} className="w-full rounded-xl border border-purple-300 bg-purple-50 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 disabled:opacity-50">
          + Add test
        </button>
      </div>
    </div>
  )
}
