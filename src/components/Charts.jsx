// Lightweight, dependency-free SVG charts for the Reports dashboard.
// Identity is never colour-alone: every chart ships with labels + values, and a
// data table lives alongside it in ReportsPanel.

// Donut / pie — part-to-whole for a few categories (e.g. gender).
export function Donut({ data, size = 168, thickness = 24, centerLabel, centerSub }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2
  const gap = total > 0 ? 2 : 0
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
        ) : (
          data
            .filter((d) => d.value > 0)
            .map((d, i) => {
              const frac = d.value / total
              const len = frac * c
              const dash = Math.max(0.001, len - gap)
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${d.label}: ${d.value} (${Math.round(frac * 100)}%)`}</title>
                </circle>
              )
              offset += len
              return el
            })
        )}
      </g>
      {centerLabel != null && (
        <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontSize: 26, fontWeight: 600, fill: '#0f172a' }}>
          {centerLabel}
        </text>
      )}
      {centerSub && (
        <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>
          {centerSub}
        </text>
      )}
    </svg>
  )
}

export function Legend({ data, total }) {
  return (
    <ul className="space-y-1.5">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
          <span className="text-slate-600">{d.label}</span>
          <span className="ml-auto tabular-nums text-slate-500">
            {d.value}
            {total ? ` · ${Math.round((d.value / total) * 100)}%` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Horizontal bars — magnitude across categories (age group, status).
export function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-slate-600 truncate">{d.label}</span>
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color || '#10b981' }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="w-6 text-right text-sm tabular-nums text-slate-700">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// Area/line — arrivals over the day (change over time, single series).
export function AreaTrend({ points, color = '#10b981', height = 90 }) {
  const w = 300
  const h = height
  const pad = 6
  const max = Math.max(1, ...points.map((p) => p.value))
  const n = points.length
  const step = n > 1 ? w / (n - 1) : 0
  const xy = points.map((p, i) => [i * step, h - pad - (p.value / max) * (h - pad * 2)])
  const line = xy.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ')
  const area = n > 1 ? `${line} L${w},${h} L0,${h} Z` : ''

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {n > 1 && <path d={area} fill={color} opacity="0.12" />}
      {n > 1 ? (
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ) : (
        <text x={w / 2} y={h / 2} textAnchor="middle" style={{ fontSize: 12, fill: '#94a3b8' }}>
          Not enough data yet
        </text>
      )}
      {xy.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r="2.5" fill={color}>
          <title>{`${points[i].label}: ${points[i].value}`}</title>
        </circle>
      ))}
    </svg>
  )
}
