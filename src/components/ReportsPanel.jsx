import { useMemo, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { subscribe, STATUS, ageGroup, bookingType } from '../lib/store.js'
import { Donut, Legend, Bars, AreaTrend } from './Charts.jsx'

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
const GENDER_COLORS = { Male: '#8B5CF6', Female: '#C084FC', Other: '#7C3AED', Unknown: '#DDD6FE' }
const AGE_ORDER = ['Child', 'Teen', 'Adult', 'Senior', 'Unknown']
const STATUS_COLORS = {
  [STATUS.WAITING]: '#A855F7',
  [STATUS.IN_CONSULT]: '#7C3AED',
  [STATUS.DONE]: '#8B5CF6',
  [STATUS.LEFT]: '#C084FC',
  [STATUS.NO_SHOW]: '#D8B4FE',
  [STATUS.PAUSED]: '#5B21B6',
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

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const d = Array.from({ length: m + 1 }, (_, i) => [i])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }
  return d[m][n]
}

function findSimilarNameMatches(rows) {
  const map = new Map()
  const cleaned = rows.map((r) => ({
    id: r.id,
    name: r.name,
    norm: (r.name || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, ''),
  }))

  for (let i = 0; i < cleaned.length; i++) {
    for (let j = i + 1; j < cleaned.length; j++) {
      const a = cleaned[i]
      const b = cleaned[j]
      if (!a.norm || !b.norm) continue

      const maxDist = Math.min(a.norm.length, b.norm.length) > 5 ? 2 : 1
      const dist = levenshtein(a.norm, b.norm)
      const isSimilar = dist <= maxDist || a.norm.startsWith(b.norm) || b.norm.startsWith(a.norm)

      if (isSimilar) {
        if (!map.has(a.id)) map.set(a.id, [])
        if (!map.has(b.id)) map.set(b.id, [])
        map.get(a.id).push(b.name)
        map.get(b.id).push(a.name)
      }
    }
  }
  return map
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

  const similarNamesMap = useMemo(() => findSimilarNameMatches(filtered), [filtered])
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
  const ageData = AGE_ORDER.map((k) => ({ label: k, value: ageCounts[k] || 0, color: '#8B5CF6' })).filter((d) => d.value > 0)
  const statusData = Object.entries(STATUS_LABEL).map(([k, label]) => ({ label, value: filtered.filter((r) => r.status === k).length, color: STATUS_COLORS[k] })).filter((d) => d.value > 0)

  const bookingData = ['Pre-booked', 'Walk-in'].map((t) => ({
    label: t, value: filtered.filter((r) => bookingType(r) === t).length,
    color: { 'Pre-booked': '#7C3AED', 'Walk-in': '#C084FC' }[t],
  })).filter((d) => d.value > 0)

  const reasonsData = useMemo(() => {
    const t = {}
    filtered.forEach((r) => {
      const syms = r.notes?.symptoms
      if (Array.isArray(syms)) syms.forEach((s) => { const k = String(s).trim(); if (k) t[k] = (t[k] || 0) + 1 })
    })
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, color: '#8B5CF6' }))
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
      'Similar Name Alert': similarNamesMap.has(r.id) ? `Similar to: ${similarNamesMap.get(r.id).join(', ')}` : 'No',
    }))
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Note: 'No patients match the current filters' }])
    ws['!cols'] = [{ wch: 18 }, { wch: 6 }, { wch: 10 }, { wch: 9 }, { wch: 13 }, { wch: 14 }, { wch: 9 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Patients')
    XLSX.writeFile(wb, `sporting-ethos-report-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const anyFilter = gender !== 'All' || group !== 'All' || status !== 'All'
  const similarCount = similarNamesMap.size

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="rounded-2xl border border-purple-100/70 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-purple-950">Performance Overview</h1>
            <p className="text-sm text-purple-600/80">{scope === 'today' ? "Today's attendance & flow" : 'All-time attendance & flow'}</p>
          </div>
          <button onClick={exportExcel} className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 active:scale-95 transition">
            ⬇ Download Excel
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Select label="Scope" value={scope} onChange={setScope} options={[['today', 'Today'], ['all', 'All time']]} />
          <Select label="Gender" value={gender} onChange={setGender} options={optList(['All', 'Male', 'Female', 'Other', 'Unknown'])} />
          <Select label="Age group" value={group} onChange={setGroup} options={optList(['All', 'Child', 'Teen', 'Adult', 'Senior', 'Unknown'])} />
          <Select label="Status" value={status} onChange={setStatus} options={[['All', 'All'], ...Object.entries(STATUS_LABEL)]} />
          {anyFilter && (
            <button onClick={() => { setGender('All'); setGroup('All'); setStatus('All') }} className="rounded-xl border border-purple-200 px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {similarCount > 0 && (
        <div className="rounded-2xl border border-purple-300 bg-purple-50/80 p-4 flex items-center justify-between gap-3 text-purple-950 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-bold text-sm">Similar Name Alert ({similarCount} patients)</span>
              <p className="text-xs text-purple-800">Multiple patients with identical or closely sounding names were detected. Review highlighted table entries to avoid chart misassignment.</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI hero */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Attended" value={m.total} sub={scope === 'today' ? 'today' : 'all time'} accent="text-purple-950" />
        <Kpi label="Completed" value={m.done} sub={`${m.completionPct}% of attended`} accent="text-purple-700" />
        <Kpi label="Avg wait" value={`${m.avgWait}m`} sub="currently waiting" accent="text-purple-900" />
        <Kpi label="LWBS rate" value={`${m.lwbsPct}%`} sub={`${m.lwbs} left`} accent="text-purple-600" />
        <Kpi label="Waiting now" value={m.waiting} sub={`${m.inConsult} in consult`} accent="text-purple-800" />
        <Kpi label="Pharmacy revenue" value={`₹${m.pharmacyRevenue}`} sub="collected" accent="text-purple-700" />
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
              <div className="mt-1 flex justify-between text-[10px] text-purple-400 font-semibold">
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
            <p className="text-sm text-purple-400 py-8 text-center">No charted consultations yet — reasons appear here once the expert records notes.</p>
          )}
        </ChartCard>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-purple-100/70 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-purple-100/60 text-xs font-bold uppercase tracking-wider text-purple-500">
          Patients attended{scope === 'today' ? ' today' : ''} · {filtered.length}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-purple-500 border-b border-purple-100/60">
                <Th>Name</Th><Th>Age</Th><Th>Gender</Th><Th>Booking</Th><Th>Reason</Th><Th>Status</Th><Th>Checked in</Th><Th>In clinic</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-purple-400">No patients match these filters.</td></tr>
              ) : filtered.map((r) => {
                const reason = reasonOf(r)
                const similarTo = similarNamesMap.get(r.id)

                return (
                <tr key={r.id} className={`border-b border-purple-50/50 last:border-0 hover:bg-purple-50/40 transition ${similarTo ? 'bg-purple-50/80' : ''}`}>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-purple-950">{r.name}</span>
                      {similarTo && (
                        <span
                          title={`Similar name match: ${similarTo.join(', ')}`}
                          className="cursor-help inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200"
                        >
                          ⚠️ Similar ({similarTo.length})
                        </span>
                      )}
                      {r.priority === 'emergency' && <span className="ml-1 text-[10px] font-bold text-purple-700 uppercase">Emergency</span>}
                    </div>
                  </Td>
                  <Td>{r.age ?? '—'}</Td>
                  <Td>{r.gender || '—'}</Td>
                  <Td><BookingTag row={r} /></Td>
                  <Td className="max-w-[220px]">
                    {reason ? <span className="text-purple-800 line-clamp-1" title={reason}>{reason}</span> : <span className="text-purple-300">—</span>}
                  </Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td className="text-purple-600">{new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Td>
                  <Td className="text-purple-600">{minutesSince(r.check_in_time)}m</Td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function optList(arr) { return arr.map((a) => [a, a]) }

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-purple-500 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-950 focus:border-purple-500 outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-purple-100/70 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-purple-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Insight({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-purple-100/70 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">{label}</div>
        <div className="text-base font-bold text-purple-950">{value}</div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-purple-100/70 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-4">{title}</div>
      {children}
    </div>
  )
}
function NoData() { return <p className="text-sm text-purple-400 py-8 text-center">No data for these filters.</p> }

function BookingTag({ row }) {
  const walk = bookingType(row) === 'Walk-in'
  const cls = walk ? 'bg-purple-100/60 text-purple-800' : 'bg-purple-600 text-white font-bold'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {walk ? 'Walk-in' : 'Pre-booked'}{row.appointment_id ? ` · ${row.appointment_id}` : ''}
    </span>
  )
}

function StatusPill({ status }) {
  const styles = {
    [STATUS.WAITING]: 'bg-purple-100 text-purple-900', [STATUS.IN_CONSULT]: 'bg-purple-600 text-white font-bold',
    [STATUS.DONE]: 'bg-purple-200 text-purple-950', [STATUS.LEFT]: 'bg-purple-100 text-purple-700',
    [STATUS.NO_SHOW]: 'bg-purple-100 text-purple-700', [STATUS.PAUSED]: 'bg-purple-900 text-white font-bold',
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] || 'bg-purple-100 text-purple-800'}`}>{STATUS_LABEL[status] || status}</span>
}
function Th({ children }) { return <th className="px-4 py-2.5 font-bold">{children}</th> }
function Td({ children, className = '' }) { return <td className={`px-4 py-3 ${className}`}>{children}</td> }
