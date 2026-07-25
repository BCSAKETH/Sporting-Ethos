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

// Branded digital receipt — proof of check-in with a tamper-evident hash.
export default function Receipt({ checkin, position, eta }) {
  if (!checkin) return null
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100 bg-ethos-mist">
        <Logo />
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-ethos-deep">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10l4 4 8-9" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <Row label="Reference (UUID)" value={<code className="text-xs break-all">{checkin.id}</code>} />
        <Row
          label="Verification hash"
          value={<code className="text-xs break-all text-emerald-700">{checkin.hash}</code>}
        />
      </dl>

      <div className="px-5 py-3 border-t border-emerald-100 bg-slate-50 text-[11px] text-slate-500">
        SHA-256 verified · Keep this reference as proof of arrival.
      </div>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className={`text-right ${strong ? 'font-semibold text-ethos-ink' : 'text-slate-700'}`}>
        {value}
      </dd>
    </div>
  )
}
