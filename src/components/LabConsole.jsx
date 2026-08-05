import { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeLabOrders, updateLabOrder } from '../lib/store.js'
import { supabase } from '../lib/supabase.js'

const STATUS_META = {
  pending: { label: 'Awaiting Patient', color: 'bg-slate-100 text-slate-600' },
  scheduled: { label: 'Scheduled (Clinic)', color: 'bg-sky-100 text-sky-800' },
  completed_internal: { label: 'Completed · Internal', color: 'bg-emerald-100 text-emerald-800' },
  completed_external: { label: 'Completed · External', color: 'bg-purple-100 text-purple-800' },
}

export default function LabConsole() {
  const [orders, setOrders] = useState([])
  useEffect(() => subscribeLabOrders(setOrders), [])

  const groups = useMemo(() => ({
    scheduled: orders.filter((o) => o.status === 'scheduled'),
    pending: orders.filter((o) => o.status === 'pending'),
    completed: orders.filter((o) => o.status === 'completed_internal' || o.status === 'completed_external'),
  }), [orders])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Diagnostic Lab Console</h2>
        <p className="text-sm text-slate-500">Scheduled clinic appointments, result uploads, and completed reports.</p>
      </div>

      <LabGroup title="Scheduled at Clinic — upload results" empty="No scheduled lab appointments." orders={groups.scheduled} uploadable />
      <LabGroup title="Awaiting patient fulfillment" empty="No pending lab orders." orders={groups.pending} />
      <LabGroup title="Completed reports" empty="No completed reports yet." orders={groups.completed} />
    </div>
  )
}

function LabGroup({ title, empty, orders, uploadable }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{title} ({orders.length})</div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">{empty}</div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((o) => <LabRow key={o.id} order={o} uploadable={uploadable} />)}
        </div>
      )}
    </div>
  )
}

function LabRow({ order, uploadable }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const meta = STATUS_META[order.status] || STATUS_META.pending

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('File must be under 2MB.'); return }
    setBusy(true)
    try {
      const path = `${order.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('lab-results').getPublicUrl(path)
      await updateLabOrder(order.id, {
        status: 'completed_internal',
        fulfillment_type: 'internal',
        result_url: data.publicUrl,
        uploaded_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error(err)
      alert('Upload failed. See console.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-bold text-slate-900 truncate">{order.test_name}</div>
        <div className="text-xs text-slate-500">
          {order.patient_name}
          {order.scheduled_slot ? ` · ${new Date(order.scheduled_slot).toLocaleString()}` : ''}
          {order.prep_instructions ? ` · Prep: ${order.prep_instructions}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
        {order.result_url && (
          <a href={order.result_url} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
            View
          </a>
        )}
        {uploadable && (
          <>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
              {busy ? 'Uploading…' : 'Upload Result'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
