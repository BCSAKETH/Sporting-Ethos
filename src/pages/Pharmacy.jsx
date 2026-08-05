import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { getStaffSession, clearStaffSession } from './AccessGate.jsx'
import {
  subscribe,
  findCheckinByAppointment,
  subscribeMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  savePharmacyBill,
} from '../lib/store.js'
import { downloadBillPDF, makeBillNo, rupees } from '../lib/bill.js'

export default function Pharmacy() {
  const session = getStaffSession()
  return <Console pharmacist={session} onLogout={clearStaffSession} />
}

function Console({ pharmacist, onLogout }) {
  const [tab, setTab] = useState('counter')
  const [meds, setMeds] = useState([])
  const [checkins, setCheckins] = useState([])

  useEffect(() => subscribeMedicines(setMeds), [])
  useEffect(() => subscribe(setCheckins), [])

  const pendingPrescriptions = useMemo(() => {
    return checkins.filter(
      (r) => (r.notes?.prescriptions && r.notes.prescriptions.length > 0) && !r.pharmacy?.paid
    )
  }, [checkins])

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Pharmacy &amp; Dawa Vitran
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <Tab active={tab === 'counter'} onClick={() => setTab('counter')}>
              Dispense Counter ({pendingPrescriptions.length})
            </Tab>
            <Tab active={tab === 'inventory'} onClick={() => setTab('inventory')}>
              Inventory &amp; Batches ({meds.length})
            </Tab>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">
              {pharmacist?.name || 'Central Pharmacy Staff'}
            </span>
            <Link
              to="/"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Desk
            </Link>
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === 'counter' ? (
          <Counter meds={meds} pendingList={pendingPrescriptions} />
        ) : (
          <Inventory meds={meds} />
        )}
      </main>
    </div>
  )
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/60'
      }`}
    >
      {children}
    </button>
  )
}

/* ---- Counter: dispense by appointment ID or pending queue ---- */
function firstWord(s) {
  return String(s).trim().split(/\s+/)[0].toLowerCase()
}

function Counter({ meds, pendingList }) {
  const [appt, setAppt] = useState('')
  const [patient, setPatient] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [order, setOrder] = useState([])
  const [busy, setBusy] = useState(false)
  const [paidBill, setPaidBill] = useState(null)
  const [add, setAdd] = useState('')

  function selectPatient(p) {
    setAppt(p.appointment_id || '')
    setNotFound(false)
    setPaidBill(null)
    setPatient(p)

    if (p.pharmacy?.paid) {
      setPaidBill(p.pharmacy)
      setOrder([])
      return
    }

    const matched = []
    ;(p.notes?.prescriptions || []).forEach((presc) => {
      const med = meds.find((m) => presc.toLowerCase().includes(firstWord(m.name)))
      if (med && !matched.some((o) => o.medicine_id === med.id)) {
        matched.push({ medicine_id: med.id, name: med.name, price: Number(med.price), qty: 1 })
      } else if (!med) {
        matched.push({ medicine_id: null, name: presc, price: 0, qty: 1 })
      }
    })
    setOrder(matched)
  }

  async function lookup(e) {
    e?.preventDefault()
    if (!appt.trim()) return
    setNotFound(false)
    setPaidBill(null)
    setOrder([])
    setPatient(null)
    const p = await findCheckinByAppointment(appt)
    if (!p) return setNotFound(true)
    selectPatient(p)
  }

  const prescriptions = patient?.notes?.prescriptions || []

  const total = order.reduce((s, o) => s + o.price * o.qty, 0)
  const setQty = (i, d) =>
    setOrder((o) => o.map((it, idx) => (idx === i ? { ...it, qty: Math.max(1, it.qty + d) } : it)))
  const removeItem = (i) => setOrder((o) => o.filter((_, idx) => idx !== i))
  const addMed = (m) => {
    if (!order.some((o) => o.medicine_id === m.id)) {
      setOrder((o) => [...o, { medicine_id: m.id, name: m.name, price: Number(m.price), qty: 1 }])
    }
    setAdd('')
  }

  async function takePayment() {
    if (!patient || !order.length) return
    setBusy(true)
    try {
      const bill = {
        bill_no: makeBillNo(),
        items: order.map(({ name, price, qty }) => ({ name, price, qty })),
        total,
        paid: true,
        paid_at: new Date().toISOString(),
      }
      await savePharmacyBill(patient.id, bill)
      for (const it of order) {
        if (it.medicine_id) {
          const m = meds.find((x) => x.id === it.medicine_id)
          if (m) await updateMedicine(it.medicine_id, { stock: Math.max(0, (m.stock || 0) - it.qty) })
        }
      }
      downloadBillPDF(patient, bill)
      setPaidBill(bill)
    } catch (e) {
      console.error(e)
      alert('Dispensing failed. See console.')
    } finally {
      setBusy(false)
    }
  }

  const searchResults = add.trim()
    ? meds.filter((m) => m.name.toLowerCase().includes(add.toLowerCase())).slice(0, 6)
    : []

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left 1-Col: Live Pending Prescriptions Queue */}
      <div className="card p-5 bg-white border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Pending OPD Prescriptions</h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            {pendingList.length} Ready
          </span>
        </div>

        <div className="mt-3 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {pendingList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No pending doctor e-prescriptions.
            </div>
          ) : (
            pendingList.map((p) => {
              const isSelected = patient?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className={`w-full text-left rounded-2xl border p-3.5 transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{p.name}</span>
                    <span className="font-mono text-xs font-bold text-emerald-700">
                      {p.appointment_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.notes?.prescriptions?.length || 0} Prescribed Meds
                  </p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right 2-Cols: Lookup & Dispense Order */}
      <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
        <div className="card p-5 bg-white border border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Lookup Patient Ticket</h2>
          <form onSubmit={lookup} className="mt-3 flex gap-2">
            <input
              value={appt}
              onChange={(e) => setAppt(e.target.value)}
              placeholder="e.g. APT-0001"
              className="input flex-1 uppercase font-mono font-bold"
            />
            <button className="rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 shadow-sm">
              Find
            </button>
          </form>

          {notFound && (
            <p className="mt-3 text-xs font-semibold text-rose-600">
              No patient found for that ticket ID.
            </p>
          )}

          {patient && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{patient.name}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {patient.appointment_id}
                    {patient.age != null ? ` · ${patient.age} yrs` : ''}
                    {patient.gender ? ` · ${patient.gender}` : ''}
                  </div>
                </div>
              </div>

              {prescriptions.length > 0 && (
                <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Prescribed by Doctor
                  </div>
                  <ul className="mt-2 text-xs text-slate-800 space-y-1 font-medium">
                    {prescriptions.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dispense Order & Receipt */}
        <div className="card p-5 bg-white border border-slate-200">
          {paidBill ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
                  DISPENSED
                </span>
                <h2 className="text-lg font-bold text-slate-900">Receipt #{paidBill.bill_no}</h2>
              </div>
              <ul className="mt-3 divide-y divide-slate-100">
                {paidBill.items.map((it, i) => (
                  <li key={i} className="flex justify-between py-2 text-xs font-medium">
                    <span className="text-slate-800">
                      {it.name} × {it.qty}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {rupees(it.price * it.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between font-bold text-slate-900 text-lg border-t border-slate-100 pt-2">
                <span>Total</span>
                <span className="tabular-nums">{rupees(paidBill.total)}</span>
              </div>
              <button
                onClick={() => patient && downloadBillPDF(patient, paidBill)}
                className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition"
              >
                ⬇ Download e-Prescription &amp; Bill (PDF)
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-bold text-slate-900">Pharmacy Dispense Order</h2>
              {!patient ? (
                <p className="mt-3 text-xs text-slate-400">Select a pending patient to dispense.</p>
              ) : (
                <>
                  {order.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">No items in order. Add below.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                      {order.map((it, i) => (
                        <li key={i} className="flex items-center gap-2 py-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {it.name}
                            </div>
                            <div className="text-[10px] text-slate-500">{rupees(it.price)} each</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setQty(i, -1)}
                              className="h-6 w-6 rounded-lg border border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-xs tabular-nums font-bold text-slate-900">
                              {it.qty}
                            </span>
                            <button
                              onClick={() => setQty(i, 1)}
                              className="h-6 w-6 rounded-lg border border-slate-300 text-slate-800 font-bold hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-14 text-right text-xs font-mono font-bold text-slate-900">
                            {rupees(it.price * it.qty)}
                          </span>
                          <button
                            onClick={() => removeItem(i)}
                            className="text-slate-400 hover:text-rose-600 font-bold text-base px-1"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add manual medicine */}
                  <div className="mt-3 relative">
                    <input
                      value={add}
                      onChange={(e) => setAdd(e.target.value)}
                      placeholder="Add extra medicine…"
                      className="input w-full text-xs"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                        {searchResults.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => addMed(m)}
                            className="flex w-full items-center justify-between px-3.5 py-2 text-xs hover:bg-slate-50 transition"
                          >
                            <span className="text-slate-900 font-semibold">{m.name}</span>
                            <span className="text-slate-500 font-mono">
                              {rupees(m.price)} · {m.stock} stock
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-xs font-bold text-slate-600">Total Bill</span>
                    <span className="text-xl font-bold text-slate-900 tabular-nums">
                      {rupees(total)}
                    </span>
                  </div>

                  <button
                    onClick={takePayment}
                    disabled={busy || !order.length}
                    className="mt-3 w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition"
                  >
                    {busy ? 'Dispensing…' : `Dispense & Print Bill (${rupees(total)})`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---- Inventory management ---- */
function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null
  const exp = new Date(expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24))
  if (diffDays < 0) return { label: 'EXPIRED', color: 'bg-rose-100 text-rose-800 border-rose-200 font-bold' }
  if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, color: 'bg-amber-100 text-amber-800 border-amber-200' }
  return { label: `Exp: ${expiryDate}`, color: 'bg-slate-100 text-slate-700 border-slate-200' }
}

function Inventory({ meds }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [stock, setStock] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [restockMed, setRestockMed] = useState(null)

  async function add(e) {
    e.preventDefault()
    if (!name.trim()) return

    const initialStock = Number(stock) || 0
    const batches = []
    if (initialStock > 0 || expiryDate || batchNo) {
      batches.push({
        batch_no: batchNo.trim() || 'B1',
        qty: initialStock,
        expiry_date: expiryDate || null,
      })
    }

    await addMedicine({
      name: name.trim(),
      price: Number(price) || 0,
      stock: initialStock,
      category: category.trim() || null,
      batches,
    })

    setName(''); setPrice(''); setStock(''); setCategory(''); setBatchNo(''); setExpiryDate('')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-5 space-y-4 bg-white border border-slate-200">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Add New Medicine</div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="sm:col-span-2 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Medicine Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol 650mg" className="input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Price (₹)</span>
            <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Analgesic" className="input mt-1 w-full" />
          </label>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Initial Batch Details</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch No (e.g. B-101)" className="input w-full" />
            <input value={stock} inputMode="numeric" onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Initial Stock Qty" className="input w-full" />
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input w-full" />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-sm transition">
            Add Medicine
          </button>
        </div>
      </form>

      <div className="card overflow-hidden bg-white border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
          Inventory &amp; Batches · {meds.length} Items
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2.5 font-bold">Medicine</th>
                <th className="px-4 py-2.5 font-bold">Price (₹)</th>
                <th className="px-4 py-2.5 font-bold">Total Stock</th>
                <th className="px-4 py-2.5 font-bold">Batches &amp; Expiry Dates</th>
                <th className="px-4 py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No medicines yet — add some above.
                  </td>
                </tr>
              ) : (
                meds.map((m) => {
                  const batches = m.batches && Array.isArray(m.batches) && m.batches.length > 0
                    ? m.batches
                    : [{ batch_no: 'Default', qty: m.stock || 0, expiry_date: m.expiry_date || null }]

                  const totalQty = batches.reduce((s, b) => s + Number(b.qty || 0), 0)

                  return (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{m.category || 'Uncategorized'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          defaultValue={m.price}
                          onBlur={(e) => updateMedicine(m.id, { price: Number(e.target.value) || 0 })}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-900"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold tabular-nums ${totalQty <= 10 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {totalQty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {batches.map((b, i) => {
                            const status = getExpiryStatus(b.expiry_date)
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 text-xs rounded-lg border px-2 py-1 ${
                                  status ? status.color : 'bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className="font-semibold">{b.batch_no || `Batch ${i + 1}`}:</span>
                                <span>{b.qty} units</span>
                                {status && <span className="font-bold">({status.label})</span>}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setRestockMed(m)}
                          className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                        >
                          + Restock
                        </button>
                        <button
                          onClick={() => deleteMedicine(m.id)}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {restockMed && (
        <RestockModal medicine={restockMed} onClose={() => setRestockMed(null)} />
      )}
    </div>
  )
}

function RestockModal({ medicine, onClose }) {
  const existingBatches = medicine.batches && Array.isArray(medicine.batches) && medicine.batches.length > 0
    ? medicine.batches
    : [{ batch_no: 'Batch 1', qty: medicine.stock || 0, expiry_date: medicine.expiry_date || null }]

  const [batchNo, setBatchNo] = useState('')
  const [qty, setQty] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleRestock(e) {
    e.preventDefault()
    if (!qty || Number(qty) <= 0) return
    setBusy(true)

    const newBatch = {
      batch_no: batchNo.trim() || `Batch ${existingBatches.length + 1}`,
      qty: Number(qty),
      expiry_date: expiryDate || null,
    }

    const updatedBatches = [...existingBatches, newBatch]
    const updatedStock = updatedBatches.reduce((s, b) => s + Number(b.qty || 0), 0)

    try {
      await updateMedicine(medicine.id, {
        batches: updatedBatches,
        stock: updatedStock,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Restock Medicine</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>
        <p className="mt-1 text-sm text-emerald-800 font-bold">{medicine.name}</p>
        <p className="text-xs text-slate-500">Add a new batch with quantity and expiry date.</p>

        <form onSubmit={handleRestock} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Batch Number / Identifier</span>
            <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. Batch 2 (B-102)" className="input mt-1 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Restock Qty</span>
              <input value={qty} inputMode="numeric" onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} placeholder="50" className="input mt-1 w-full" required />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Expiry Date</span>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input mt-1 w-full" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-60 transition">
              {busy ? 'Restocking…' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
