import { STATUS } from '../lib/store.js'

function since(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

const DOT = {
  [STATUS.WAITING]: 'bg-amber-500',
  [STATUS.WAITING_RECEPTION]: 'bg-amber-500',
  [STATUS.WAITING_DEPARTMENT]: 'bg-sky-500',
  [STATUS.IN_CONSULT]: 'bg-emerald-600',
  [STATUS.DONE]: 'bg-slate-400',
  [STATUS.LEFT]: 'bg-rose-400',
  [STATUS.NO_SHOW]: 'bg-rose-400',
  [STATUS.PAUSED]: 'bg-slate-400',
}
const STATUS_LABEL = {
  [STATUS.WAITING]: 'Waiting Desk',
  [STATUS.WAITING_RECEPTION]: 'Waiting Desk',
  [STATUS.WAITING_DEPARTMENT]: 'Waiting OPD',
  [STATUS.IN_CONSULT]: 'In consult',
  [STATUS.DONE]: 'Done',
  [STATUS.LEFT]: 'Left',
  [STATUS.NO_SHOW]: 'No-show',
  [STATUS.PAUSED]: 'Paused',
}

export default function QueueCard({ row, position, isNew, eta, onStatus, onPriority, onForward, isCalled }) {
  const emergency = row.priority === 'emergency'
  const faded = row.status === STATUS.DONE || row.status === STATUS.LEFT || row.status === STATUS.NO_SHOW
  const isWaiting = row.status === STATUS.WAITING || row.status === STATUS.WAITING_RECEPTION || row.status === STATUS.WAITING_DEPARTMENT || row.status === STATUS.PAUSED

  return (
    <div
      className={`rounded-2xl border bg-white p-4.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        emergency ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50/20' : 'border-slate-200'
      } ${isNew ? 'flash-in' : ''} ${faded ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {position != null && (
            <div className="shrink-0 h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              {position}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 truncate">{row.name}</span>
              {emergency && (
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wide">
                  Emergency
                </span>
              )}
              {row.department_name && (
                <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  {row.department_name}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              {row.appointment_id || 'walk-in'} · {since(row.check_in_time)}
              {eta ? ` · ~${eta}` : ''}
            </div>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span className={`h-2 w-2 rounded-full ${DOT[row.status] || 'bg-slate-400'}`} />
          {STATUS_LABEL[row.status] || 'Waiting'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isWaiting && (
          <>
            <Btn tone="primary" onClick={() => onStatus(row.id, STATUS.IN_CONSULT)}>
              Call next
            </Btn>

            {onForward && (
              <button
                disabled={!isCalled}
                onClick={() => isCalled && onForward(row)}
                title={!isCalled ? "Click 'Call next' to call patient to counter first" : "Forward patient to Doctor OPD"}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isCalled
                    ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                ➡ Forward to Doctor
              </button>
            )}

            {row.status === STATUS.PAUSED ? (
              <Btn onClick={() => onStatus(row.id, STATUS.WAITING)}>Resume</Btn>
            ) : (
              <Btn onClick={() => onStatus(row.id, STATUS.PAUSED)}>Pause</Btn>
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
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-sm shadow-emerald-600/20 active:scale-95',
    danger: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 active:scale-95',
    default: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}
