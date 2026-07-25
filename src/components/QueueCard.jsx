import { STATUS } from '../lib/store.js'

function since(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

const DOT = {
  [STATUS.WAITING]: 'bg-amber-500',
  [STATUS.IN_CONSULT]: 'bg-sky-500',
  [STATUS.DONE]: 'bg-slate-400',
  [STATUS.LEFT]: 'bg-rose-500',
  [STATUS.NO_SHOW]: 'bg-rose-500',
  [STATUS.PAUSED]: 'bg-violet-500',
}
const STATUS_LABEL = {
  [STATUS.WAITING]: 'Waiting',
  [STATUS.IN_CONSULT]: 'In consult',
  [STATUS.DONE]: 'Done',
  [STATUS.LEFT]: 'Left',
  [STATUS.NO_SHOW]: 'No-show',
  [STATUS.PAUSED]: 'Paused',
}

export default function QueueCard({ row, position, isNew, eta, onStatus, onPriority }) {
  const emergency = row.priority === 'emergency'
  const faded = row.status === STATUS.DONE || row.status === STATUS.LEFT || row.status === STATUS.NO_SHOW

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition ${
        emergency ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
      } ${isNew ? 'flash-in' : ''} ${faded ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {position != null && (
            <div className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-semibold shadow-sm">
              {position}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">{row.name}</span>
              {emergency && (
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 uppercase tracking-wide">
                  Emergency
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {row.appointment_id || 'walk-in'} · {since(row.check_in_time)}
              {eta ? ` · ~${eta}` : ''}
            </div>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[row.status]}`} />
          {STATUS_LABEL[row.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(row.status === STATUS.WAITING || row.status === STATUS.PAUSED) && (
          <>
            <Btn tone="primary" onClick={() => onStatus(row.id, STATUS.IN_CONSULT)}>
              Call next
            </Btn>
            {row.status === STATUS.WAITING ? (
              <Btn onClick={() => onStatus(row.id, STATUS.PAUSED)}>Pause</Btn>
            ) : (
              <Btn onClick={() => onStatus(row.id, STATUS.WAITING)}>Resume</Btn>
            )}
            <Btn onClick={() => onStatus(row.id, STATUS.LEFT)}>Left</Btn>
            <Btn
              tone={emergency ? 'default' : 'danger'}
              onClick={() => onPriority(row.id, emergency ? 'normal' : 'emergency')}
            >
              {emergency ? 'Clear priority' : 'Emergency'}
            </Btn>
          </>
        )}
        {row.status === STATUS.IN_CONSULT && (
          <Btn tone="primary" onClick={() => onStatus(row.id, STATUS.DONE)}>
            Mark done
          </Btn>
        )}
        {faded && <Btn onClick={() => onStatus(row.id, STATUS.WAITING)}>Re-queue</Btn>}
      </div>
    </div>
  )
}

function Btn({ tone = 'default', onClick, children }) {
  const tones = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
    danger: 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50',
    default: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${tones[tone]}`}
    >
      {children}
    </button>
  )
}
