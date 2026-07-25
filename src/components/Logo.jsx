// Simple inline brand mark for Sporting Ethos — no external asset needed.
export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#065f46" />
        <path
          d="M11 24c3.5 3.2 14.5 3.2 18 0M13 16c2.5-2.4 11.5-2.4 14 0"
          stroke="#10b981"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="3.4" fill="#ecfdf5" />
      </svg>
      <div className="leading-tight">
        <div className="font-bold text-ethos-deep tracking-tight">Sporting Ethos</div>
        <div className="text-[10px] uppercase tracking-widest text-ethos-green font-semibold">
          Performance · Health
        </div>
      </div>
    </div>
  )
}
