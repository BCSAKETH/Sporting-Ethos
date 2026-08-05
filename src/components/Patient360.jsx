import { useEffect, useState } from 'react'
import { listAdmissions, setPriority, forwardToDepartment, roomDays } from '../lib/store.js'
import { rupees } from '../lib/bill.js'

// Admin 360° patient drawer — personal data, live OPD/IPD status, prescriptions,
// full financials, and quick actions.
export default function Patient360({ row, departments = [], onClose }) {
  const [admission, setAdmission] = useState(null)
  const [reassign, setReassign] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let alive = true
    listAdmissions('admitted')
      .then((list) => {
        if (!alive) return
        const match = list.find(
          (a) => (row.patient_id && a.patient_id === row.patient_id) ||
                 (a.patient_name || '').trim().toLowerCase() === (row.name || '').trim().toLowerCase()
        )
        setAdmission(match || null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [row])

  const dept = departments.find((d) => d.id === row.department_id)
  const consultFee = Number(dept?.consultation_fee || 0)
  const pharmacyTotal = Number(row.pharmacy?.total || 0)
  const roomCharges = admission
    ? roomDays(admission.admission_date) * Number(admission.rooms?.daily_rate || 0)
    : 0
  const grandTotal = consultFee + pharmacyTotal + roomCharges

  const structured = Array.isArray(row.prescriptions) ? row.prescriptions : []
  const freeText = row.notes?.prescriptions || []

  async function bumpEmergency() {
    setBusy('emg')
    try { await setPriority(row.id, row.priority === 'emergency' ? 'normal' : 'emergency') } finally { setBusy('') }
  }
  async function doReassign() {
    if (!reassign) return
    setBusy('reassign')
    try { await forwardToDepartment(row.id, reassign); onClose() } finally { setBusy('') }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{row.name}</h2>
            <p className="text-xs text-slate-500 font-mono">{row.queue_id || row.appointment_id || '—'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Personal */}
          <Section title="Personal">
            <Grid>
              <Field label="Age / Gender" value={`${row.age ?? '—'}${row.gender ? ` · ${row.gender}` : ''}`} />
              <Field label="Blood Group" value={row.blood_group || '—'} />
              <Field label="Phone" value={row.phone || '—'} />
              <Field label="Priority" value={row.priority === 'emergency' ? '🚨 Emergency' : 'Normal'} />
            </Grid>
          </Section>

          {/* Live status */}
          <Section title="Live Status">
            <div className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">OPD</span><span className="font-bold text-slate-900">{statusLabel(row.status)} {dept ? `· ${dept.name}` : ''}</span></div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">IPD</span>
                <span className="font-bold text-slate-900">
                  {admission ? `${admission.wards?.name || 'Ward'} · Room ${admission.rooms?.room_number} · Bed ${admission.beds?.bed_number}` : 'Not admitted'}
                </span>
              </div>
            </div>
          </Section>

          {/* Prescriptions */}
          <Section title="Prescriptions">
            {structured.length === 0 && freeText.length === 0 ? (
              <Empty>No prescriptions on record.</Empty>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {structured.map((rx, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <b className="text-slate-800">{rx.medicine_name}</b>
                    <span className="text-slate-500"> · {rx.dosage}×{rx.frequency}/day×{rx.duration_days}d · {rx.before_after_food}</span>
                  </li>
                ))}
                {structured.length === 0 && freeText.map((p, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-slate-700">{p}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* Financials */}
          <Section title="Financial Billing">
            <div className="rounded-xl border border-slate-200 p-3 text-sm space-y-1">
              <Row label="OPD Consultation" value={rupees(consultFee)} />
              <Row label="Pharmacy" value={rupees(pharmacyTotal)} />
              <Row label="Room Charges" value={rupees(roomCharges)} />
              <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5 font-bold text-slate-900">
                <span>Total</span><span>{rupees(grandTotal)}</span>
              </div>
            </div>
          </Section>

          {/* Quick actions */}
          <Section title="Quick Actions">
            <div className="space-y-2">
              <button onClick={bumpEmergency} disabled={busy === 'emg'} className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                {row.priority === 'emergency' ? 'Clear Emergency' : '🚨 Bump to Emergency #1'}
              </button>
              <div className="flex gap-2">
                <select value={reassign} onChange={(e) => setReassign(e.target.value)} className="input flex-1 text-sm">
                  <option value="">Re-assign department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={doReassign} disabled={!reassign || busy === 'reassign'} className="rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  Assign
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function statusLabel(s) {
  return ({ waiting: 'Waiting', waiting_reception: 'At Reception', waiting_department: 'In OPD Queue', in_consult: 'In Consultation', done: 'Completed', left: 'Left', no_show: 'No-show', paused: 'Paused' })[s] || s || '—'
}
function Section({ title, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{title}</div>
      {children}
    </div>
  )
}
function Grid({ children }) { return <div className="grid grid-cols-2 gap-2">{children}</div> }
function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-2.5">
      <div className="text-[10px] font-semibold uppercase text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  )
}
function Row({ label, value }) { return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900">{value}</span></div> }
function Empty({ children }) { return <p className="text-xs text-slate-400">{children}</p> }
