import { useState, useEffect } from 'react'
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
    if (!pin.trim()) return setError('Please enter your 4-digit access code.')
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

  function handleKeyPad(num) {
    if (pin.length < 6) {
      setPin((prev) => prev + num)
      setError('')
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1))
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
          Enter your assigned 4-digit PIN to access your OPD workstation.
        </p>

        {/* PIN Dots */}
        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? 'border-emerald-600 bg-emerald-600 scale-110'
                  : 'border-slate-300 bg-slate-100'
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}

        {/* Keypad */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPad(num)}
              className="h-14 rounded-2xl bg-slate-50 text-xl font-bold text-slate-800 hover:bg-slate-100 active:scale-95 transition"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="h-14 rounded-2xl bg-slate-100 text-xs font-semibold text-slate-500 hover:bg-slate-200 active:scale-95 transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPad(0)}
            className="h-14 rounded-2xl bg-slate-50 text-xl font-bold text-slate-800 hover:bg-slate-100 active:scale-95 transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200 active:scale-95 transition"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={handlePinSubmit}
          disabled={busy || pin.length < 4}
          className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
        >
          {busy ? 'Verifying PIN…' : 'Enter Station'}
        </button>

        <p className="mt-4 text-[11px] text-slate-400">
          Default Demo PINs: Admin: <b>9999</b> | Reception: <b>1111</b> | Doctor: <b>2222</b> | Pharmacy: <b>3333</b>
        </p>
      </div>
    </div>
  )
}
