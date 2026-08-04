import { STATUS } from '../lib/store.js'

function since(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  return `${m}m ${secs % 60}s`
}

const DOT = {
  [STATUS.WAITING]: 'bg-purple-500',
  [STATUS.IN_CONSULT]: 'bg-purple-700',
  [STATUS.DONE]: 'bg-purple-300',
  [STATUS.LEFT]: 'bg-purple-400',
  [STATUS.NO_SHOW]: 'bg-purple-400',
  [STATUS.PAUSED]: 'bg-purple-800',
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
      className={`rounded-2xl border bg-white p-4.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        emergency ? 'border-purple-300 ring-2 ring-purple-200 bg-purple-50/20' : 'border-purple-100/80'
      } ${isNew ? 'flash-in' : ''} ${faded ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {position != null && (
            <div className="shrink-0 h-9 w-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-600/20">
              {position}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-950 truncate">{row.name}</span>
              {emergency && (
                <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 uppercase tracking-wide">
                  Emergency
                </span>
              )}
              {row.department_name && (
                <span className="shrink-0 rounded-full bg-purple-50 border border-purple-200/60 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                  {row.department_name}
                </span>
              )}
            </div>
            <div className="text-xs text-purple-600/80 font-medium">
              {row.appointment_id || 'walk-in'} · {since(row.check_in_time)}
              {eta ? ` · ~${eta}` : ''}
            </div>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700">
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
    primary: 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600 shadow-sm shadow-purple-600/20 active:scale-95',
    danger: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 active:scale-95',
    default: 'bg-white text-purple-900 border-purple-200/80 hover:bg-purple-50 active:scale-95',
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
