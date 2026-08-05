import { useEffect, useMemo, useState } from 'react'
import {
  listAdmissions,
  listWardTree,
  allocateBed,
  dischargePatient,
  roomDays,
  subscribeIPD,
} from '../lib/store.js'
import { rupees } from '../lib/bill.js'

// ---------------------------------------------------------------------------
// Admission Requests — doctor-recommended admissions awaiting bed allocation.
// ---------------------------------------------------------------------------
export function AdmissionRequests() {
  const [requests, setRequests] = useState([])
  const [tree, setTree] = useState([])
  const [allocating, setAllocating] = useState(null)

  const refresh = () => listAdmissions('admission_recommended').then(setRequests).catch(console.error)
  useEffect(() => {
    refresh()
    return subscribeIPD((t) => { setTree(t); refresh() })
  }, [])

  return (
    <section className="fade-up">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Admission Requests</h1>
        <p className="text-sm text-slate-500">Doctor-recommended admissions — allocate a ward, room &amp; bed.</p>
      </div>

      {requests.length === 0 ? (
        <Empty>No pending admission requests.</Empty>
      ) : (
        <div className="space-y-3">
          {requests.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{a.patient_name}</div>
                <div className="text-xs text-slate-500">{a.admission_no} · {a.departments?.name || 'General'}</div>
              </div>
              <button onClick={() => setAllocating(a)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                Allocate Bed
              </button>
            </div>
          ))}
        </div>
      )}

      {allocating && (
        <AllocateModal admission={allocating} tree={tree} onClose={() => setAllocating(null)} onDone={() => { setAllocating(null); refresh() }} />
      )}
    </section>
  )
}

function AllocateModal({ admission, tree, onClose, onDone }) {
  const [wardId, setWardId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [bedId, setBedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const ward = tree.find((w) => w.id === wardId)
  const room = ward?.rooms.find((r) => r.id === roomId)
  const availableBeds = room?.beds.filter((b) => b.status === 'Available') || []

  async function confirm() {
    if (!bedId) return setErr('Pick an available bed.')
    setBusy(true)
    setErr('')
    try {
      await allocateBed(admission.id, { ward_id: wardId, room_id: roomId, bed_id: bedId })
      onDone()
    } catch (e) {
      setErr(e?.message || 'Allocation failed.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Allocate Bed · ${admission.patient_name}`} onClose={onClose}>
      <div className="space-y-3">
        <Select label="Ward" value={wardId} onChange={(v) => { setWardId(v); setRoomId(''); setBedId('') }} options={tree.map((w) => [w.id, `${w.name}${w.department_name ? ` (${w.department_name})` : ''}`])} />
        {ward && <Select label="Room" value={roomId} onChange={(v) => { setRoomId(v); setBedId('') }} options={ward.rooms.map((r) => [r.id, `Room ${r.room_number} · ${r.room_type} · ${rupees(r.daily_rate)}/day`])} />}
        {room && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Available Bed</div>
            {availableBeds.length === 0 ? (
              <p className="text-xs text-rose-600 font-semibold">No available beds in this room.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableBeds.map((b) => (
                  <button key={b.id} onClick={() => setBedId(b.id)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${bedId === b.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {b.bed_number}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={confirm} disabled={busy || !bedId} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy ? 'Admitting…' : 'Admit to Bed'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Discharge Queue — patients a doctor cleared; reception does the checkout.
// ---------------------------------------------------------------------------
export function DischargeQueue() {
  const [queue, setQueue] = useState([])
  const [checkout, setCheckout] = useState(null)

  const refresh = () => listAdmissions('ready_for_discharge').then(setQueue).catch(console.error)
  useEffect(() => {
    refresh()
    return subscribeIPD(() => refresh())
  }, [])

  return (
    <section className="fade-up">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Discharge Queue</h1>
        <p className="text-sm text-slate-500">Patients cleared by a doctor — settle the bill &amp; check out.</p>
      </div>

      {queue.length === 0 ? (
        <Empty>No patients awaiting discharge.</Empty>
      ) : (
        <div className="space-y-3">
          {queue.map((a) => {
            const days = roomDays(a.admission_date)
            const charge = days * Number(a.rooms?.daily_rate || 0)
            return (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{a.patient_name}</div>
                  <div className="text-xs text-slate-500">
                    {a.admission_no} · {a.wards?.name} · Room {a.rooms?.room_number} · Bed {a.beds?.bed_number} · {days}d
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{rupees(charge)}</span>
                  <button onClick={() => setCheckout(a)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">Checkout</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {checkout && <CheckoutModal admission={checkout} onClose={() => setCheckout(null)} onDone={() => { setCheckout(null); refresh() }} />}
    </section>
  )
}

function CheckoutModal({ admission, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const days = roomDays(admission.admission_date)
  const rate = Number(admission.rooms?.daily_rate || 0)
  const roomCharge = days * rate
  const consultFee = Number(admission.departments?.consultation_fee || 0)
  const grand = roomCharge + consultFee

  async function confirm() {
    setBusy(true)
    try {
      const res = await dischargePatient(admission.id)
      setDone(res)
    } catch (e) {
      console.error(e)
      setBusy(false)
    }
  }

  return (
    <Modal title={done ? 'Discharge Complete' : 'Checkout & Discharge'} onClose={onClose}>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700"><b>{admission.patient_name}</b> discharged. Bed sent to cleaning.</p>
          <button onClick={onDone} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700">Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{admission.patient_name} · {admission.admission_no}</p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
            <Row label={`Room (${days}d × ${rupees(rate)})`} value={rupees(roomCharge)} />
            <Row label="Doctor / OPD" value={rupees(consultFee)} />
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-1 text-lg font-bold text-slate-900"><span>Total Due</span><span>{rupees(grand)}</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={confirm} disabled={busy} className="flex-1 rounded-xl bg-purple-600 py-3 font-bold text-white hover:bg-purple-700 disabled:opacity-50">
              {busy ? 'Processing…' : 'Confirm Payment & Discharge'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---- shared bits ----
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-full mt-1">
        <option value="">Select…</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
function Row({ label, value }) { return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900">{value}</span></div> }
function Empty({ children }) { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">{children}</div> }
