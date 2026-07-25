import { useMemo, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { subscribe, STATUS, ageGroup, bookingType } from '../lib/store.js'
import { Donut, Legend, Bars, AreaTrend } from './Charts.jsx'

// Chief reason for a visit, pulled from the AI consultation notes.
function reasonOf(row) {
  const n = row.notes
  if (!n) return null
  if (Array.isArray(n.symptoms) && n.symptoms.length) return n.symptoms[0]
  return n.summary || null
}

const STATUS_LABEL = {
  [STATUS.WAITING]: 'Waiting',
  [STATUS.IN_CONSULT]: 'In consult',
  [STATUS.DONE]: 'Done',
  [STATUS.LEFT]: 'Left (LWBS)',
  [STATUS.NO_SHOW]: 'No-show',
  [STATUS.PAUSED]: 'Paused',
}
const GENDER_COLORS = { Male: '#0ea5e9', Female: '#ec4899', Other: '#8b5cf6', Unknown: '#cbd5e1' }
const AGE_ORDER = ['Child', 'Teen', 'Adult', 'Senior', 'Unknown']
const STATUS_COLORS = {
  [STATUS.WAITING]: '#f59e0b',
  [STATUS.IN_CONSULT]: '#0ea5e9',
  [STATUS.DONE]: '#10b981',
  [STATUS.LEFT]: '#f43f5e',
  [STATUS.NO_SHOW]: '#fb7185',
  [STATUS.PAUSED]: '#8b5cf6',
}

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString()
const minutesSince = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
const fmtHour = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`
function buildArrivals(rows) {
  const b = {}
  rows.forEach((r) => { const h = new Date(r.check_in_time).getHours(); b[h] = (b[h] || 0) + 1 })
  const hours = Object.keys(b).map(Number).sort((a, c) => a - c)
  if (!hours.length) return []
  const out = []
  for (let h = hours[0]; h <= hours[hours.length - 1]; h++) out.push({ label: fmtHour(h), value: b[h] || 0 })
  return out
}
function tally(arr) { const o = {}; arr.forEach((k) => (o[k] = (o[k] || 0) + 1)); return o }
function topKey(counts, exclude = []) {
  const e = Object.entries(counts).filter(([k]) => !exclude.includes(k)).sort((a, b) => b[1] - a[1])
  return e.length ? e[0][0] : '—'
}

export default function ReportsPanel() {
  const [rows, setRows] = useState([])
  const [scope, setScope] = useState('today')
  const [gender, setGender] = useState('All')
  const [group, setGroup] = useState('All')
  const [status, setStatus] = useState('All')

  useEffect(() => subscribe(setRows), [])

  const filtered = useMemo(() =>
    rows
      .filter((r) => (scope === 'today' ? isToday(r.check_in_time) : true))
      .filter((r) => gender === 'All' || (r.gender || 'Unknown') === gender)
      .filter((r) => group === 'All' || ageGroup(r.age) === group)
      .filter((r) => status === 'All' || r.status === status)
      .sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time)),
  [rows, scope, gender, group, status])

  const arrivals = useMemo(() => buildArrivals(filtered), [filtered])
  const genderCounts = useMemo(() => tally(filtered.map((r) => r.gender || 'Unknown')), [filtered])
  const ageCounts = useMemo(() => tally(filtered.map((r) => ageGroup(r.age))), [filtered])

  const m = useMemo(() => {
    const total = filtered.length
    const by = (s) => filtered.filter((r) => r.status === s).length
    const waitingRows = filtered.filter((r) => r.status === STATUS.WAITING || r.status === STATUS.PAUSED)
    const avgWait = waitingRows.length
      ? Math.round(waitingRows.reduce((s, r) => s + minutesSince(r.check_in_time), 0) / waitingRows.length) : 0
    const done = by(STATUS.DONE)
    const lwbs = by(STATUS.LEFT)
    const peak = arrivals.reduce((best, p) => (p.value > (best?.value ?? -1) ? p : best), null)
    const pharmacyRevenue = filtered.reduce((s, r) => s + (r.pharmacy?.paid ? Number(r.pharmacy.total || 0) : 0), 0)
    return {
      total, done, waiting: waitingRows.length, inConsult: by(STATUS.IN_CONSULT),
      lwbs, noShow: by(STATUS.NO_SHOW), avgWait,
      completionPct: total ? Math.round((done / total) * 100) : 0,
      lwbsPct: total ? Math.round((lwbs / total) * 100) : 0,
      peak: peak ? peak.label : '—',
      pharmacyRevenue,
      busiestAge: topKey(ageCounts, ['Unknown']),
      topGender: topKey(genderCounts, ['Unknown']),
    }
  }, [filtered, arrivals, ageCounts, genderCounts])

  const genderData = ['Male', 'Female', 'Other', 'Unknown'].map((k) => ({ label: k, value: genderCounts[k] || 0, color: GENDER_COLORS[k] })).filter((d) => d.value > 0)
  const ageData = AGE_ORDER.map((k) => ({ label: k, value: ageCounts[k] || 0, color: '#10b981' })).filter((d) => d.value > 0)
  const statusData = Object.entries(STATUS_LABEL).map(([k, label]) => ({ label, value: filtered.filter((r) => r.status === k).length, color: STATUS_COLORS[k] })).filter((d) => d.value > 0)

  const bookingData = ['Pre-booked', 'Walk-in'].map((t) => ({
    label: t, value: filtered.filter((r) => bookingType(r) === t).length,
    color: { 'Pre-booked': '#0ea5e9', 'Walk-in': '#94a3b8' }[t],
  })).filter((d) => d.value > 0)

  // "Top reasons / conditions" — tallied from the consultation symptoms.
  const reasonsData = useMemo(() => {
    const t = {}
    filtered.forEach((r) => {
      const syms = r.notes?.symptoms
      if (Array.isArray(syms)) syms.forEach((s) => { const k = String(s).trim(); if (k) t[k] = (t[k] || 0) + 1 })
    })
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, color: '#0ea5e9' }))
  }, [filtered])
  const chartedCount = filtered.filter((r) => r.notes).length

  function exportExcel() {
    const data = filtered.map((r) => ({
      Name: r.name, Age: r.age ?? '', 'Age group': ageGroup(r.age), Gender: r.gender || 'Unknown',
      'Booking type': bookingType(r), 'Appointment ID': r.appointment_id || '', Priority: r.priority,
      Status: STATUS_LABEL[r.status] || r.status,
      'Reason (from consult)': reasonOf(r) || '',
      'Pharmacy bill (Rs.)': r.pharmacy?.paid ? Number(r.pharmacy.total || 0) : '',
      'Checked in': new Date(r.check_in_time).toLocaleString(), 'Time in clinic (min)': minutesSince(r.check_in_time),
    }))
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Note: 'No patients match the current filters' }])
    ws['!cols'] = [{ wch: 18 }, { wch: 6 }, { wch: 10 }, { wch: 9 }, { wch: 13 }, { wch: 14 }, { wch: 9 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Patients')
    XLSX.writeFile(wb, `sporting-ethos-report-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const anyFilter = gender !== 'All' || group !== 'All' || status !== 'All'

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Performance Overview</h1>
            <p className="text-sm text-slate-400">{scope === 'today' ? "Today's attendance & flow" : 'All-time attendance & flow'}</p>
          </div>
          <button onClick={exportExcel} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
            ⬇ Download Excel
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Select label="Scope" value={scope} onChange={setScope} options={[['today', 'Today'], ['all', 'All time']]} />
          <Select label="Gender" value={gender} onChange={setGender} options={optList(['All', 'Male', 'Female', 'Other', 'Unknown'])} />
          <Select label="Age group" value={group} onChange={setGroup} options={optList(['All', 'Child', 'Teen', 'Adult', 'Senior', 'Unknown'])} />
          <Select label="Status" value={status} onChange={setStatus} options={[['All', 'All'], ...Object.entries(STATUS_LABEL)]} />
          {anyFilter && (
            <button onClick={() => { setGender('All'); setGroup('All'); setStatus('All') }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* KPI hero */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Attended" value={m.total} sub={scope === 'today' ? 'today' : 'all time'} accent="text-slate-900" />
        <Kpi label="Completed" value={m.done} sub={`${m.completionPct}% of attended`} accent="text-emerald-600" />
        <Kpi label="Avg wait" value={`${m.avgWait}m`} sub="currently waiting" accent="text-slate-900" />
        <Kpi label="LWBS rate" value={`${m.lwbsPct}%`} sub={`${m.lwbs} left`} accent="text-rose-600" />
        <Kpi label="Waiting now" value={m.waiting} sub={`${m.inConsult} in consult`} accent="text-amber-600" />
        <Kpi label="Pharmacy revenue" value={`₹${m.pharmacyRevenue}`} sub="collected" accent="text-emerald-600" />
      </div>

      {/* Insights */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Insight icon="👥" label="Most common gender" value={m.topGender} />
        <Insight icon="🎂" label="Busiest age group" value={m.busiestAge} />
        <Insight icon="⏰" label="Peak arrival hour" value={m.peak} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By gender">
          {genderData.length ? (
            <div className="flex items-center gap-5">
              <Donut data={genderData} centerLabel={m.total} centerSub="patients" />
              <div className="flex-1"><Legend data={genderData} total={m.total} /></div>
            </div>
          ) : <NoData />}
        </ChartCard>
        <ChartCard title="By status">
          {statusData.length ? (
            <div className="flex items-center gap-5">
              <Donut data={statusData} centerLabel={m.total} centerSub="patients" />
              <div className="flex-1"><Legend data={statusData} total={m.total} /></div>
            </div>
          ) : <NoData />}
        </ChartCard>
        <ChartCard title="By age group">
          {ageData.length ? <Bars data={ageData} /> : <NoData />}
        </ChartCard>
        <ChartCard title="Arrivals over the day">
          {arrivals.length ? (
            <>
              <AreaTrend points={arrivals} height={110} />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>{arrivals[0].label}</span><span>{arrivals[arrivals.length - 1].label}</span>
              </div>
            </>
          ) : <NoData />}
        </ChartCard>
      </div>

      {/* Booking source + reasons from consultation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By booking type">
          {bookingData.length ? (
            <div className="flex items-center gap-5">
              <Donut data={bookingData} centerLabel={m.total} centerSub="patients" />
              <div className="flex-1"><Legend data={bookingData} total={m.total} /></div>
            </div>
          ) : <NoData />}
        </ChartCard>
        <ChartCard title={`Top reasons / conditions · from ${chartedCount} consultation${chartedCount === 1 ? '' : 's'}`}>
          {reasonsData.length ? <Bars data={reasonsData} /> : (
            <p className="text-sm text-slate-400 py-8 text-center">No charted consultations yet — reasons appear here once the expert records notes.</p>
          )}
        </ChartCard>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Patients attended{scope === 'today' ? ' today' : ''} · {filtered.length}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <Th>Name</Th><Th>Age</Th><Th>Gender</Th><Th>Booking</Th><Th>Reason</Th><Th>Status</Th><Th>Checked in</Th><Th>In clinic</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No patients match these filters.</td></tr>
              ) : filtered.map((r) => {
                const reason = reasonOf(r)
                return (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <Td>
                    <span className="font-medium text-slate-800">{r.name}</span>
                    {r.priority === 'emergency' && <span className="ml-2 text-[10px] font-bold text-rose-600 uppercase">Emergency</span>}
                  </Td>
                  <Td>{r.age ?? '—'}</Td>
                  <Td>{r.gender || '—'}</Td>
                  <Td><BookingTag row={r} /></Td>
                  <Td className="max-w-[220px]">
                    {reason ? <span className="text-slate-600 line-clamp-1" title={reason}>{reason}</span> : <span className="text-slate-300">—</span>}
                  </Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td className="text-slate-500">{new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Td>
                  <Td className="text-slate-500">{minutesSince(r.check_in_time)}m</Td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* atoms */
function optList(arr) { return arr.map((a) => [a, a]) }

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-ethos-green outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:shadow-sm transition">
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function Insight({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-base font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">{title}</div>
      {children}
    </div>
  )
}
function NoData() { return <p className="text-sm text-slate-400 py-8 text-center">No data for these filters.</p> }

function BookingTag({ row }) {
  const walk = bookingType(row) === 'Walk-in'
  const cls = walk ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {walk ? 'Walk-in' : 'Pre-booked'}{row.appointment_id ? ` · ${row.appointment_id}` : ''}
    </span>
  )
}

function StatusPill({ status }) {
  const styles = {
    [STATUS.WAITING]: 'bg-amber-100 text-amber-700', [STATUS.IN_CONSULT]: 'bg-sky-100 text-sky-700',
    [STATUS.DONE]: 'bg-emerald-100 text-emerald-700', [STATUS.LEFT]: 'bg-rose-100 text-rose-700',
    [STATUS.NO_SHOW]: 'bg-rose-100 text-rose-700', [STATUS.PAUSED]: 'bg-violet-100 text-violet-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_LABEL[status] || status}</span>
}
function Th({ children }) { return <th className="px-4 py-2 font-semibold">{children}</th> }
function Td({ children, className = '' }) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td> }
