import Logo from './Logo.jsx'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
  } catch {
    return iso
  }
}

// Digital receipt — proof of check-in with Ivory & Lavender theme.
export default function Receipt({ checkin, position, eta }) {
  if (!checkin) return null
  return (
    <div className="rounded-2xl border border-purple-100/70 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-purple-100/70 bg-purple-50/60">
        <Logo />
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-900">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10l4 4 8-9" stroke="#5B21B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Verified
        </span>
      </div>

      <dl className="px-5 py-4 space-y-3 text-sm">
        <Row label="Patient" value={checkin.name} strong />
        <Row label="Appointment ID" value={checkin.appointment_id || '— (walk-in)'} />
        <Row label="Checked in" value={formatTime(checkin.check_in_time)} />
        {typeof position === 'number' && (
          <Row label="Queue position" value={`#${position}`} strong />
        )}
        {eta && <Row label="Estimated wait" value={eta} />}
        <Row label="Reference (UUID)" value={<code className="text-xs break-all font-mono text-purple-600">{checkin.id}</code>} />
        <Row
          label="Verification hash"
          value={<code className="text-xs break-all font-mono text-purple-700 font-bold">{checkin.hash}</code>}
        />
      </dl>

      <div className="px-5 py-3 border-t border-purple-100/60 bg-[#FAF8F5] text-[11px] text-purple-500 font-semibold">
        SHA-256 verified · Keep this reference as proof of arrival.
      </div>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-purple-600/80 font-medium shrink-0">{label}</dt>
      <dd className={`text-right ${strong ? 'font-bold text-purple-950' : 'text-purple-900 font-medium'}`}>
        {value}
      </dd>
    </div>
  )
}
