// Glanceable metrics row for the Live Queue — Ivory & Lavender minimal design.
export default function MetricsStrip({ waiting, inConsult, done, lwbs, noShow, lastLatencyMs }) {
  const latency =
    lastLatencyMs == null ? '—' : lastLatencyMs < 1000 ? '<1s' : `${(lastLatencyMs / 1000).toFixed(1)}s`

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Metric label="Confirmed in" value={latency} accent="primary" hero />
      <Metric label="Waiting" value={waiting} accent="purple" />
      <Metric label="In consult" value={inConsult} accent="violet" />
      <Metric label="Done" value={done} accent="deep" />
      <Metric label="Left · LWBS" value={lwbs} accent="muted" />
      <Metric label="No-show" value={noShow} accent="muted" />
    </div>
  )
}

const ACCENTS = {
  primary: { text: 'text-purple-700', bar: 'bg-purple-600' },
  purple: { text: 'text-purple-600', bar: 'bg-purple-500' },
  violet: { text: 'text-purple-800', bar: 'bg-purple-700' },
  deep: { text: 'text-purple-950', bar: 'bg-purple-900' },
  muted: { text: 'text-purple-400', bar: 'bg-purple-300' },
}

function Metric({ label, value, accent, hero }) {
  const a = ACCENTS[accent]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-100/80 bg-white px-4 py-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <span className={`absolute left-0 top-0 h-full w-1 ${a.bar}`} />
      <div className={`pl-1 ${hero ? 'text-3xl' : 'text-2xl'} font-bold tabular-nums ${a.text}`}>{value}</div>
      <div className="pl-1 text-[11px] font-semibold uppercase tracking-wider text-purple-400 mt-0.5">{label}</div>
    </div>
  )
}
