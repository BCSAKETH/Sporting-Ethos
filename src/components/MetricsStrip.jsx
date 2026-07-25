// Premium, glanceable metrics row for the Live Queue.
export default function MetricsStrip({ waiting, inConsult, done, lwbs, noShow, lastLatencyMs }) {
  const latency =
    lastLatencyMs == null ? '—' : lastLatencyMs < 1000 ? '<1s' : `${(lastLatencyMs / 1000).toFixed(1)}s`

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Metric label="Confirmed in" value={latency} accent="emerald" hero />
      <Metric label="Waiting" value={waiting} accent="amber" />
      <Metric label="In consult" value={inConsult} accent="sky" />
      <Metric label="Done" value={done} accent="slate" />
      <Metric label="Left · LWBS" value={lwbs} accent="rose" />
      <Metric label="No-show" value={noShow} accent="rose" />
    </div>
  )
}

const ACCENTS = {
  emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-600', bar: 'bg-amber-500' },
  sky: { text: 'text-sky-600', bar: 'bg-sky-500' },
  slate: { text: 'text-slate-700', bar: 'bg-slate-400' },
  rose: { text: 'text-rose-600', bar: 'bg-rose-500' },
}

function Metric({ label, value, accent, hero }) {
  const a = ACCENTS[accent]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:shadow-md transition">
      <span className={`absolute left-0 top-0 h-full w-1 ${a.bar}`} />
      <div className={`pl-1 ${hero ? 'text-3xl' : 'text-2xl'} font-bold tabular-nums ${a.text}`}>{value}</div>
      <div className="pl-1 text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
