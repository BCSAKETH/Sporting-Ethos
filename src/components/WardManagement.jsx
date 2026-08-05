import { useEffect, useMemo, useState } from 'react'
import {
  subscribeIPD,
  admitPatient,
  dischargePatient,
  flagReadyForDischarge,
  setBedStatus,
  roomDays,
} from '../lib/store.js'
import { rupees } from '../lib/bill.js'

const BED_STYLE = {
  Available: 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
  Occupied: 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100',
  Cleaning: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100',
  Reserved: 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100',
}

// Inpatient ward / bed allocation console — reused by the Admin & Doctor views.
export default function WardManagement() {
  const [tree, setTree] = useState([])
  const [admitTarget, setAdmitTarget] = useState(null) // { ward, room, bed }
  const [dischargeTarget, setDischargeTarget] = useState(null) // { ward, room, bed }

  useEffect(() => subscribeIPD(setTree), [])

  const stats = useMemo(() => {
    const s = { total: 0, Occupied: 0, Available: 0, Cleaning: 0, Reserved: 0 }
    tree.forEach((w) => w.rooms.forEach((r) => r.beds.forEach((b) => {
      s.total++
      s[b.status] = (s[b.status] || 0) + 1
    })))
    return s
  }, [tree])

  function onBedClick(ward, room, bed) {
    if (bed.status === 'Available' || bed.status === 'Reserved') setAdmitTarget({ ward, room, bed })
    else if (bed.status === 'Occupied') setDischargeTarget({ ward, room, bed })
    else if (bed.status === 'Cleaning') setBedStatus(bed.id, 'Available').catch(console.error)
  }

  return (
    <div className="space-y-6">
      {/* Occupancy matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Total Beds" value={stats.total} tone="text-slate-900" />
        <Stat label="Occupied" value={stats.Occupied} tone="text-rose-700" />
        <Stat label="Available" value={stats.Available} tone="text-emerald-700" />
        <Stat label="Cleaning" value={stats.Cleaning} tone="text-amber-600" />
        <Stat label="Reserved" value={stats.Reserved} tone="text-sky-700" />
      </div>

      <p className="text-xs text-slate-500">
        Click an <b className="text-emerald-700">Available</b> bed to admit · an{' '}
        <b className="text-rose-700">Occupied</b> bed to discharge · a{' '}
        <b className="text-amber-600">Cleaning</b> bed to mark cleaned.
      </p>

      {tree.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          No wards configured yet.
        </div>
      ) : (
        <div className="space-y-5">
          {tree.map((ward) => (
            <div key={ward.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{ward.name}</h3>
                  <p className="text-xs text-slate-500">
                    {ward.department_name || 'General'} · Floor {ward.floor || '—'}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {ward.total_beds} beds
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {ward.rooms.map((room) => (
                  <div key={room.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-slate-800">Room {room.room_number}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                        {room.room_type}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        {rupees(room.daily_rate)}/day
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {room.beds.map((bed) => (
                        <button
                          key={bed.id}
                          onClick={() => onBedClick(ward, room, bed)}
                          title={bed.admission ? `${bed.admission.patient_name} · ${bed.admission.admission_no}` : bed.status}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition min-w-[92px] text-left ${BED_STYLE[bed.status] || ''}`}
                        >
                          <div className="font-bold">{bed.bed_number}</div>
                          <div className="text-[10px] font-semibold opacity-80 truncate">
                            {bed.admission ? bed.admission.patient_name : bed.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {admitTarget && (
        <AdmitModal target={admitTarget} onClose={() => setAdmitTarget(null)} />
      )}
      {dischargeTarget && (
        <DischargeModal target={dischargeTarget} onClose={() => setDischargeTarget(null)} />
      )}
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

function AdmitModal({ target, onClose }) {
  const { ward, room, bed } = target
  const [name, setName] = useState('')
  const [nurse, setNurse] = useState('')
  const [expected, setExpected] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Enter the patient name.')
    setBusy(true)
    setErr('')
    try {
      await admitPatient({
        patient_name: name.trim(),
        department_id: ward.department_id || null,
        ward_id: ward.id,
        room_id: room.id,
        bed_id: bed.id,
        nurse_name: nurse.trim() || null,
        expected_discharge: expected || null,
      })
      onClose()
    } catch (e2) {
      setErr(e2?.message || 'Admission failed.')
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Admit Patient">
      <p className="text-sm text-slate-600">
        <b>{ward.name}</b> → Room {room.room_number} ({room.room_type}) → Bed{' '}
        <b>{bed.bed_number}</b> · {rupees(room.daily_rate)}/day
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="Patient full name" className="input w-full" />
        <input value={nurse} onChange={(e) => setNurse(e.target.value)} placeholder="Assigned nurse (optional)" className="input w-full" />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected discharge (optional)</span>
          <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className="input w-full mt-1" />
        </label>
        {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Admitting…' : 'Admit to Bed'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DischargeModal({ target, onClose }) {
  const { room, bed } = target
  const adm = bed.admission
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const days = adm ? roomDays(adm.admission_date) : 0
  const rate = Number(room.daily_rate || 0)
  const running = days * rate

  async function confirm() {
    if (!adm) return
    setBusy(true)
    try {
      const result = await dischargePatient(adm.id)
      setDone(result)
    } catch (e) {
      console.error(e)
      setBusy(false)
    }
  }

  async function flagReady() {
    if (!adm) return
    setBusy(true)
    try {
      await flagReadyForDischarge(adm.id)
      onClose()
    } catch (e) {
      console.error(e)
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title={done ? 'Discharge Complete' : 'Discharge Patient'}>
      {!adm ? (
        <p className="text-sm text-slate-500">No active admission on this bed.</p>
      ) : done ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700"><b>{adm.patient_name}</b> discharged. Bed sent to cleaning.</p>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex justify-between text-sm"><span>Days ({rupees(rate)}/day)</span><span className="font-bold">{done.days}</span></div>
            <div className="flex justify-between text-lg font-bold text-slate-900 mt-1 border-t border-emerald-200 pt-2">
              <span>Room Charges</span><span>{rupees(done.room_charges)}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700">Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            <b>{adm.patient_name}</b> · {adm.admission_no}<br />
            Room {room.room_number} · Bed {bed.bed_number}
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex justify-between text-sm text-slate-600"><span>Admitted</span><span>{new Date(adm.admission_date).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-slate-600 mt-1"><span>Days so far (min 1)</span><span className="font-bold text-slate-900">{days}</span></div>
            <div className="flex justify-between text-lg font-bold text-slate-900 mt-2 border-t border-slate-200 pt-2">
              <span>Running Room Bill</span><span>{rupees(running)}</span>
            </div>
          </div>
          <button onClick={flagReady} disabled={busy} className="w-full rounded-xl border border-purple-300 bg-purple-50 py-2.5 font-bold text-purple-800 hover:bg-purple-100 disabled:opacity-50">
            🏳️ Flag Ready for Discharge → Reception
          </button>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={confirm} disabled={busy} className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-700 disabled:opacity-60">
              {busy ? 'Discharging…' : 'Discharge Now'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
