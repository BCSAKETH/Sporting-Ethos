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
    <div className="min-h-full flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm card p-6">
        <div className="flex justify-center mb-4"><Logo /></div>
        <h1 className="text-center text-lg font-semibold text-slate-900">Pharmacy</h1>
        <p className="text-center text-sm text-slate-500 mt-1">Enter the pharmacy access code.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input autoFocus type="password" value={code} onChange={(e) => { setCode(e.target.value); setErr('') }}
            placeholder="Access code" className="input text-center tracking-widest" />
          {err && <p className="text-sm text-red-600 text-center">{err}</p>}
          <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">Enter</button>
        </form>
        <Link to="/" className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600">← Reception dashboard</Link>
      </div>
    </div>
  )
}

function Console({ onLogout }) {
  const [tab, setTab] = useState('counter')
  const [meds, setMeds] = useState([])
  useEffect(() => subscribeMedicines(setMeds), [])

  return (
    <div className="min-h-full">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Pharmacy</span>
          </div>
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <Tab active={tab === 'counter'} onClick={() => setTab('counter')}>Counter</Tab>
            <Tab active={tab === 'inventory'} onClick={() => setTab('inventory')}>Inventory</Tab>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">Reception</Link>
            <button onClick={onLogout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">Lock</button>
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
    <button onClick={onClick} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
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
  const [order, setOrder] = useState([]) // {medicine_id, name, price, qty}
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
    // Auto-match prescriptions -> inventory
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
      // decrement stock
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
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Dispense by appointment</h2>
        <form onSubmit={lookup} className="mt-3 flex gap-2">
          <input value={appt} onChange={(e) => setAppt(e.target.value)} placeholder="e.g. APT-0007" className="input flex-1 uppercase" />
          <button className="rounded-xl bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800">Find</button>
        </form>

        {notFound && <p className="mt-3 text-sm text-rose-600">No patient found for that appointment ID.</p>}

        {patient && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{patient.name}</div>
                <div className="text-xs text-slate-500">{patient.appointment_id}{patient.age != null ? ` · ${patient.age}y` : ''}{patient.gender ? ` · ${patient.gender}` : ''}</div>
              </div>
            </div>

            {prescriptions.length > 0 && (
              <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prescribed in consultation</div>
                <ul className="mt-1 text-sm text-slate-700 space-y-0.5">
                  {prescriptions.map((p, i) => <li key={i} className="flex gap-2"><span className="text-slate-300">•</span>{p}</li>)}
                </ul>
              </div>
            )}
            {patient.notes == null && <p className="mt-3 text-sm text-slate-400">No consultation notes yet — add items manually.</p>}
          </div>
        )}
      </div>

      {/* Order / bill */}
      <div className="card p-6">
        {paidBill ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">PAID</span>
              <h2 className="text-lg font-semibold text-slate-900">Bill {paidBill.bill_no}</h2>
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {paidBill.items.map((it, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-700">{it.name} × {it.qty}</span>
                  <span className="tabular-nums text-slate-600">{rupees(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between font-semibold text-slate-900"><span>Total</span><span className="tabular-nums">{rupees(paidBill.total)}</span></div>
            <button onClick={() => patient && downloadBillPDF(patient, paidBill)} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">⬇ Download bill (PDF)</button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Order</h2>
            {!patient ? (
              <p className="mt-3 text-sm text-slate-400">Find a patient to build their order.</p>
            ) : (
              <>
                {order.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No items yet. Add medicines below.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {order.map((it, i) => (
                      <li key={i} className="flex items-center gap-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{it.name}</div>
                          <div className="text-xs text-slate-400">{rupees(it.price)} each</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(i, -1)} className="h-7 w-7 rounded-lg border border-slate-200 text-slate-600">−</button>
                          <span className="w-6 text-center text-sm tabular-nums">{it.qty}</span>
                          <button onClick={() => setQty(i, 1)} className="h-7 w-7 rounded-lg border border-slate-200 text-slate-600">+</button>
                        </div>
                        <span className="w-16 text-right text-sm tabular-nums text-slate-700">{rupees(it.price * it.qty)}</span>
                        <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500">×</button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add medicine */}
                <div className="mt-3 relative">
                  <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add medicine…" className="input" />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                      {searchResults.map((m) => (
                        <button key={m.id} onClick={() => addMed(m)} className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50">
                          <span className="text-slate-700">{m.name}</span>
                          <span className="text-slate-400">{rupees(m.price)} · {m.stock} in stock</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">{rupees(total)}</span>
                </div>
                <button onClick={takePayment} disabled={busy || !order.length} className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
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
function Inventory({ meds }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('')

  async function add(e) {
    e.preventDefault()
    if (!name.trim()) return
    await addMedicine({ name: name.trim(), price: Number(price) || 0, stock: Number(stock) || 0, category: category.trim() || null })
    setName(''); setPrice(''); setStock(''); setCategory('')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="card p-4 grid gap-3 sm:grid-cols-5 items-end">
        <label className="sm:col-span-2 block"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Medicine</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input !text-base !py-2.5" /></label>
        <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price (₹)</span>
          <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" className="input !text-base !py-2.5" /></label>
        <label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stock</span>
          <input value={stock} inputMode="numeric" onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" className="input !text-base !py-2.5" /></label>
        <div className="flex gap-2">
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="input !text-base !py-2.5" />
          <button className="rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 shrink-0">Add</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">Inventory · {meds.length}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2">Medicine</th><th className="px-4 py-2">Category</th><th className="px-4 py-2">Price (₹)</th><th className="px-4 py-2">Stock</th><th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {meds.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No medicines yet — add some above.</td></tr>
              ) : meds.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.category || '—'}</td>
                  <td className="px-4 py-2.5">
                    <input defaultValue={m.price} onBlur={(e) => updateMedicine(m.id, { price: Number(e.target.value) || 0 })}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input defaultValue={m.stock} onBlur={(e) => updateMedicine(m.id, { stock: Number(e.target.value) || 0 })}
                      className={`w-20 rounded-lg border px-2 py-1 text-sm ${m.stock <= 10 ? 'border-rose-300 text-rose-600' : 'border-slate-200'}`} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => deleteMedicine(m.id)} className="text-slate-300 hover:text-rose-500">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
