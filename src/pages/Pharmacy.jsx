import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import {
  findCheckinByAppointment,
  subscribeMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  savePharmacyBill,
} from '../lib/store.js'
import { downloadBillPDF, makeBillNo, rupees } from '../lib/bill.js'

const PHARMACY_CODE = import.meta.env.VITE_PHARMACY_CODE || 'pharmacy'
const AUTH_KEY = 'ethos_pharmacy_authed'

export default function Pharmacy() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === '1')
  if (!authed) return <Gate onOk={() => setAuthed(true)} />
  return <Console onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthed(false) }} />
}

function Gate({ onOk }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  function submit(e) {
    e.preventDefault()
    if (code.trim() === PHARMACY_CODE) { localStorage.setItem(AUTH_KEY, '1'); onOk() }
    else setErr('Incorrect code.')
  }
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-5 bg-[#FAF8F5]">
      <div className="w-full max-w-sm card p-6 bg-white border border-purple-100/70 shadow-xl">
        <div className="flex justify-center mb-4"><Logo /></div>
        <h1 className="text-center text-xl font-bold text-purple-950">Pharmacy</h1>
        <p className="text-center text-sm text-purple-600/80 mt-1">Enter the pharmacy access code.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input autoFocus type="password" value={code} onChange={(e) => { setCode(e.target.value); setErr('') }}
            placeholder="Access code" className="input text-center tracking-widest bg-white" />
          {err && <p className="text-sm text-purple-600 text-center font-semibold">{err}</p>}
          <button type="submit" className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition">Enter</button>
        </form>
        <Link to="/" className="mt-4 block text-center text-xs text-purple-400 font-medium hover:text-purple-700">← Reception dashboard</Link>
      </div>
    </div>
  )
}

function Console({ onLogout }) {
  const [tab, setTab] = useState('counter')
  const [meds, setMeds] = useState([])
  useEffect(() => subscribeMedicines(setMeds), [])

  return (
    <div className="min-h-full bg-[#FAF8F5]">
      <header className="bg-[#FAF8F5] border-b border-purple-200/60 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-purple-100/80 border border-purple-200/60 px-2.5 py-1 text-xs font-bold text-purple-800">Pharmacy</span>
          </div>
          <nav className="flex items-center gap-1 rounded-xl bg-purple-100/70 p-1 border border-purple-200/40">
            <Tab active={tab === 'counter'} onClick={() => setTab('counter')}>Counter</Tab>
            <Tab active={tab === 'inventory'} onClick={() => setTab('inventory')}>Inventory</Tab>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-xl border border-purple-200/80 bg-white px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50 transition">Reception</Link>
            <button onClick={onLogout} className="rounded-xl border border-purple-200/80 bg-white px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50 transition">Lock</button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-5 py-6">
        {tab === 'counter' ? <Counter meds={meds} /> : <Inventory meds={meds} />}
      </main>
    </div>
  )
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-purple-600 text-white shadow-sm font-semibold' : 'text-purple-800 hover:bg-purple-200/40'}`}>
      {children}
    </button>
  )
}

/* ---- Counter: dispense by appointment ID ---- */
function firstWord(s) { return String(s).trim().split(/\s+/)[0].toLowerCase() }

function Counter({ meds }) {
  const [appt, setAppt] = useState('')
  const [patient, setPatient] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [order, setOrder] = useState([])
  const [busy, setBusy] = useState(false)
  const [paidBill, setPaidBill] = useState(null)
  const [add, setAdd] = useState('')

  const prescriptions = patient?.notes?.prescriptions || []
  const unmatched = useMemo(() => {
    if (!patient) return []
    const orderNames = new Set(order.map((o) => o.name.toLowerCase()))
    return prescriptions.filter((p) => !meds.some((m) => p.toLowerCase().includes(firstWord(m.name)) && orderNames.has(m.name.toLowerCase())))
  }, [patient, prescriptions, meds, order])

  async function lookup(e) {
    e?.preventDefault()
    setNotFound(false); setPaidBill(null); setOrder([]); setPatient(null)
    const p = await findCheckinByAppointment(appt)
    if (!p) return setNotFound(true)
    setPatient(p)
    if (p.pharmacy?.paid) { setPaidBill(p.pharmacy); return }
    const matched = []
    ;(p.notes?.prescriptions || []).forEach((presc) => {
      const med = meds.find((m) => presc.toLowerCase().includes(firstWord(m.name)))
      if (med && !matched.some((o) => o.medicine_id === med.id)) matched.push({ medicine_id: med.id, name: med.name, price: Number(med.price), qty: 1 })
    })
    setOrder(matched)
  }

  const total = order.reduce((s, o) => s + o.price * o.qty, 0)
  const setQty = (i, d) => setOrder((o) => o.map((it, idx) => idx === i ? { ...it, qty: Math.max(1, it.qty + d) } : it))
  const removeItem = (i) => setOrder((o) => o.filter((_, idx) => idx !== i))
  const addMed = (m) => { if (!order.some((o) => o.medicine_id === m.id)) setOrder((o) => [...o, { medicine_id: m.id, name: m.name, price: Number(m.price), qty: 1 }]); setAdd('') }

  async function takePayment() {
    if (!patient || !order.length) return
    setBusy(true)
    try {
      const bill = { bill_no: makeBillNo(), items: order.map(({ name, price, qty }) => ({ name, price, qty })), total, paid: true, paid_at: new Date().toISOString() }
      await savePharmacyBill(patient.id, bill)
      for (const it of order) {
        if (it.medicine_id) {
          const m = meds.find((x) => x.id === it.medicine_id)
          if (m) await updateMedicine(it.medicine_id, { stock: Math.max(0, (m.stock || 0) - it.qty) })
        }
      }
      downloadBillPDF(patient, bill)
      setPaidBill(bill)
    } catch (e) { console.error(e); alert('Payment failed — see console.') } finally { setBusy(false) }
  }

  const searchResults = add.trim()
    ? meds.filter((m) => m.name.toLowerCase().includes(add.toLowerCase())).slice(0, 6)
    : []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6 bg-white border border-purple-100/70 shadow-sm">
        <h2 className="text-lg font-bold text-purple-950">Dispense by appointment</h2>
        <form onSubmit={lookup} className="mt-3 flex gap-2">
          <input value={appt} onChange={(e) => setAppt(e.target.value)} placeholder="e.g. APT-0007" className="input flex-1 uppercase bg-white" />
          <button className="rounded-xl bg-purple-950 px-5 font-semibold text-white hover:bg-purple-900 shadow-md">Find</button>
        </form>

        {notFound && <p className="mt-3 text-sm text-purple-600 font-semibold">No patient found for that appointment ID.</p>}

        {patient && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-purple-950">{patient.name}</div>
                <div className="text-xs text-purple-600 font-medium">{patient.appointment_id}{patient.age != null ? ` · ${patient.age}y` : ''}{patient.gender ? ` · ${patient.gender}` : ''}</div>
              </div>
            </div>

            {prescriptions.length > 0 && (
              <div className="mt-3 rounded-xl bg-purple-50/70 border border-purple-200/60 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600">Prescribed in consultation</div>
                <ul className="mt-1 text-sm text-purple-900 space-y-0.5 font-medium">
                  {prescriptions.map((p, i) => <li key={i} className="flex gap-2"><span className="text-purple-400">•</span>{p}</li>)}
                </ul>
              </div>
            )}
            {patient.notes == null && <p className="mt-3 text-sm text-purple-400">No consultation notes yet — add items manually.</p>}
          </div>
        )}
      </div>

      {/* Order / bill */}
      <div className="card p-6 bg-white border border-purple-100/70 shadow-sm">
        {paidBill ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-xs font-bold">PAID</span>
              <h2 className="text-lg font-bold text-purple-950">Bill {paidBill.bill_no}</h2>
            </div>
            <ul className="mt-3 divide-y divide-purple-100/60">
              {paidBill.items.map((it, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-purple-900 font-medium">{it.name} × {it.qty}</span>
                  <span className="tabular-nums font-semibold text-purple-950">{rupees(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between font-bold text-purple-950 text-lg"><span>Total</span><span className="tabular-nums">{rupees(paidBill.total)}</span></div>
            <button onClick={() => patient && downloadBillPDF(patient, paidBill)} className="mt-4 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition">⬇ Download bill (PDF)</button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-purple-950">Order</h2>
            {!patient ? (
              <p className="mt-3 text-sm text-purple-400">Find a patient to build their order.</p>
            ) : (
              <>
                {order.length === 0 ? (
                  <p className="mt-3 text-sm text-purple-400">No items yet. Add medicines below.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-purple-100/60">
                    {order.map((it, i) => (
                      <li key={i} className="flex items-center gap-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-purple-950 truncate">{it.name}</div>
                          <div className="text-xs text-purple-500">{rupees(it.price)} each</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(i, -1)} className="h-7 w-7 rounded-lg border border-purple-200 text-purple-800 font-bold hover:bg-purple-50">−</button>
                          <span className="w-6 text-center text-sm tabular-nums font-bold text-purple-950">{it.qty}</span>
                          <button onClick={() => setQty(i, 1)} className="h-7 w-7 rounded-lg border border-purple-200 text-purple-800 font-bold hover:bg-purple-50">+</button>
                        </div>
                        <span className="w-16 text-right text-sm tabular-nums font-bold text-purple-950">{rupees(it.price * it.qty)}</span>
                        <button onClick={() => removeItem(i)} className="text-purple-300 hover:text-purple-700 font-bold text-lg">×</button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add medicine */}
                <div className="mt-3 relative">
                  <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add medicine…" className="input bg-white" />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-purple-200 bg-white shadow-xl">
                      {searchResults.map((m) => (
                        <button key={m.id} onClick={() => addMed(m)} className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm hover:bg-purple-50 transition">
                          <span className="text-purple-950 font-semibold">{m.name}</span>
                          <span className="text-purple-600 text-xs font-medium">{rupees(m.price)} · {m.stock} in stock</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-purple-700">Total</span>
                  <span className="text-2xl font-bold text-purple-950 tabular-nums">{rupees(total)}</span>
                </div>
                <button onClick={takePayment} disabled={busy || !order.length} className="mt-3 w-full rounded-xl bg-purple-600 py-3.5 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-60 active:scale-95 transition">
                  {busy ? 'Processing…' : `Take payment · ${rupees(total)}`}
                </button>
              </>
            )}
          </div>
        )}
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
  if (diffDays < 0) return { label: 'EXPIRED', color: 'bg-purple-200 text-purple-950 border-purple-300 font-bold' }
  if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, color: 'bg-purple-100 text-purple-800 border-purple-200' }
  return { label: `Exp: ${expiryDate}`, color: 'bg-purple-50 text-purple-700 border-purple-200/60' }
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
    <div className="space-y-5">
      <form onSubmit={add} className="card p-5 space-y-4 bg-white border border-purple-100/70 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-purple-500">Add New Medicine</div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="sm:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Medicine Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol 500mg" className="input mt-1 bg-white" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Price (₹)</span>
            <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="input mt-1 bg-white" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Analgesic" className="input mt-1 bg-white" />
          </label>
        </div>

        <div className="border-t border-purple-100/60 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Initial Batch Details</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch No (e.g. B-101)" className="input bg-white" />
            <input value={stock} inputMode="numeric" onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Initial Stock Qty" className="input bg-white" />
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input bg-white" />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="rounded-xl bg-purple-600 px-6 py-2.5 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition">Add Medicine</button>
        </div>
      </form>

      <div className="card overflow-hidden bg-white border border-purple-100/70 shadow-sm">
        <div className="px-4 py-3 border-b border-purple-100/60 text-xs font-bold uppercase tracking-wider text-purple-500">Inventory &amp; Batches · {meds.length}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-purple-500 border-b border-purple-100/60">
                <th className="px-4 py-2.5 font-bold">Medicine</th>
                <th className="px-4 py-2.5 font-bold">Price (₹)</th>
                <th className="px-4 py-2.5 font-bold">Total Stock</th>
                <th className="px-4 py-2.5 font-bold">Batches &amp; Expiry Dates</th>
                <th className="px-4 py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meds.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-purple-400">No medicines yet — add some above.</td></tr>
              ) : meds.map((m) => {
                const batches = m.batches && Array.isArray(m.batches) && m.batches.length > 0
                  ? m.batches
                  : [{ batch_no: 'Default', qty: m.stock || 0, expiry_date: m.expiry_date || null }]

                const totalQty = batches.reduce((s, b) => s + Number(b.qty || 0), 0)

                return (
                  <tr key={m.id} className="border-b border-purple-50/50 last:border-0 hover:bg-purple-50/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-purple-950">{m.name}</div>
                      <div className="text-xs text-purple-500 font-medium">{m.category || 'Uncategorized'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input defaultValue={m.price} onBlur={(e) => updateMedicine(m.id, { price: Number(e.target.value) || 0 })}
                        className="w-20 rounded-lg border border-purple-200 px-2 py-1 text-sm font-semibold text-purple-950 bg-white" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold tabular-nums ${totalQty <= 10 ? 'text-purple-600' : 'text-purple-950'}`}>
                        {totalQty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {batches.map((b, i) => {
                          const status = getExpiryStatus(b.expiry_date)
                          return (
                            <span key={i} className={`inline-flex items-center gap-1 text-xs rounded-lg border px-2 py-1 ${status ? status.color : 'bg-purple-50 border-purple-200/60 text-purple-800'}`}>
                              <span className="font-semibold">{b.batch_no || `Batch ${i + 1}`}:</span>
                              <span>{b.qty} units</span>
                              {status && <span className="font-bold">({status.label})</span>}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => setRestockMed(m)} className="rounded-xl bg-purple-100 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-800 hover:bg-purple-200 transition">
                        + Restock
                      </button>
                      <button onClick={() => deleteMedicine(m.id)} className="text-xs text-purple-400 font-medium hover:text-purple-700">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md card p-6 bg-[#FAF8F5] border border-purple-200/70 shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-purple-950">Restock Medicine</h2>
          <button onClick={onClose} className="text-purple-400 hover:text-purple-700 text-xl font-bold leading-none">×</button>
        </div>
        <p className="mt-1 text-sm text-purple-800 font-semibold">{medicine.name}</p>
        <p className="text-xs text-purple-500">Add a new batch with its quantity and expiry date.</p>

        <form onSubmit={handleRestock} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Batch Number / Identifier</span>
            <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. Batch 2 (B-102)" className="input mt-1 bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Restock Qty</span>
              <input value={qty} inputMode="numeric" onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} placeholder="50" className="input mt-1 bg-white" required />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Expiry Date</span>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input mt-1 bg-white" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-purple-200 py-2.5 font-semibold text-purple-800 hover:bg-purple-50 transition">Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-purple-600 py-2.5 font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-60 transition">
              {busy ? 'Restocking…' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
