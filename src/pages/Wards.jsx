import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import WardManagement from '../components/WardManagement.jsx'
import { getStaffSession, clearStaffSession } from './AccessGate.jsx'

export default function Wards() {
  const session = getStaffSession()
  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
              Inpatient Ward &amp; Bed Management
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">{session?.name || 'Ward Staff'}</span>
            <Link to="/expert" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">OPD</Link>
            <button onClick={clearStaffSession} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">🔒 Lock</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">
        <WardManagement />
      </main>
    </div>
  )
}
