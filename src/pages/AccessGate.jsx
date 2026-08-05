import { useState } from 'react'
import Logo from '../components/Logo.jsx'
import { verifyStaffAccessCode } from '../lib/store.js'

export function getStaffSession() {
  try {
    const raw = sessionStorage.getItem('ethos_staff_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearStaffSession() {
  sessionStorage.removeItem('ethos_staff_session')
  window.location.href = '/'
}

export default function AccessGate({ children, requiredRole }) {
  const [session, setSession] = useState(() => getStaffSession())
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isUnlocked = Boolean(session && (!requiredRole || session.role === 'admin' || session.role === requiredRole))

  async function handlePinSubmit(e) {
    if (e) e.preventDefault()
    if (!pin.trim()) return setError('Please enter your access code.')
    setError('')
    setBusy(true)

    try {
      const staff = await verifyStaffAccessCode(pin.trim())
      if (!staff) {
        setError('Invalid access code. Please check with your administrator.')
        setBusy(false)
        return
      }

      sessionStorage.setItem('ethos_staff_session', JSON.stringify(staff))
      setSession(staff)
      setPin('')

      // Redirect based on role
      if (staff.role === 'admin') {
        window.location.href = '/admin'
      } else if (staff.role === 'doctor') {
        window.location.href = '/expert'
      } else if (staff.role === 'pharmacist') {
        window.location.href = '/pharmacy'
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      console.error(err)
      setError('Verification failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (isUnlocked) {
    return (
      <div className="relative min-h-full">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>

        <h1 className="text-xl font-bold text-slate-900">Hospital Staff Access</h1>
        <p className="mt-1 text-xs text-slate-500">
          Enter your assigned alphanumeric access code to enter your station.
        </p>

        <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
          {/* Alphanumeric Text Input */}
          <div>
            <input
              autoFocus
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value)
                setError('')
              }}
              placeholder="e.g. 9999 or DOC-101"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-center text-lg font-bold font-mono tracking-wider focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 outline-none uppercase bg-slate-50"
            />
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !pin.trim()}
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
          >
            {busy ? 'Verifying Code…' : 'Enter Station'}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-slate-400">
          Default Demo Codes: Admin: <b>9999</b> | Reception: <b>1111</b> | Doctor: <b>2222</b> | Pharmacy: <b>3333</b>
        </p>
      </div>
    </div>
  )
}
