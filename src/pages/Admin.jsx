import { useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Logo from '../components/Logo.jsx'
import MetricsStrip from '../components/MetricsStrip.jsx'
import ReportsPanel from '../components/ReportsPanel.jsx'
import { clearStaffSession, getStaffSession } from './AccessGate.jsx'
import {
  listStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  listDepartments,
  subscribe,
  STATUS,
} from '../lib/store.js'

export default function Admin() {
  const [tab, setTab] = useState('staff') // 'staff' | 'analytics' | 'qr'
  const [staffList, setStaffList] = useState([])
  const [departments, setDepartments] = useState([])
  const [rows, setRows] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)

  const session = getStaffSession()

  useEffect(() => {
    loadStaff()
    listDepartments().then(setDepartments).catch(console.error)
    return subscribe(setRows)
  }, [])

  async function loadStaff() {
    try {
      const data = await listStaff()
      setStaffList(data)
    } catch (e) {
      console.error('Failed to load staff list', e)
    }
  }

  async function handleToggleActive(staffMember) {
    await updateStaff(staffMember.id, { is_active: !staffMember.is_active })
    loadStaff()
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to remove this staff member?')) return
    await deleteStaff(id)
    loadStaff()
  }

  const inConsult = rows.filter((r) => r.status === STATUS.IN_CONSULT)
  const metrics = {
    waiting: rows.filter((r) => r.status === STATUS.WAITING || r.status === STATUS.WAITING_RECEPTION || r.status === STATUS.WAITING_DEPARTMENT || r.status === STATUS.PAUSED).length,
    inConsult: inConsult.length,
    done: rows.filter((r) => r.status === STATUS.DONE).length,
    lwbs: rows.filter((r) => r.status === STATUS.LEFT).length,
    noShow: rows.filter((r) => r.status === STATUS.NO_SHOW).length,
    lastLatencyMs: null,
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 uppercase tracking-wider">
              Admin Portal
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setTab('staff')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Staff &amp; Access Codes
            </button>
            <button
              onClick={() => setTab('analytics')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Analytics &amp; Reports
            </button>
            <button
              onClick={() => setTab('qr')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Counter QR Poster
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">
              {session?.name || 'Administrator'}
            </span>
            <button
              onClick={clearStaffSession}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6">
        {tab === 'staff' ? (
          <div className="space-y-6 fade-up">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Hospital Staff &amp; Access Control</h1>
                <p className="text-sm text-slate-500">
                  Manage staff accounts, assign 4-digit PINs, and set OPD department permissions.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                ＋ Add Staff Member
              </button>
            </div>

            {/* Staff Directory Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Staff Roster ({staffList.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 font-semibold">Name</th>
                      <th className="px-5 py-3 font-semibold">Role</th>
                      <th className="px-5 py-3 font-semibold">Assigned Department</th>
                      <th className="px-5 py-3 font-semibold">Access Code (PIN)</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                          No staff accounts configured. Click "Add Staff Member" above to create one.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((s) => {
                        const deptName = s.departments?.name || departments.find((d) => d.id === s.department_id)?.name || 'General / All'
                        return (
                          <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                            <td className="px-5 py-3.5 font-bold text-slate-900">{s.name}</td>
                            <td className="px-5 py-3.5">
                              <RoleBadge role={s.role} />
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">{deptName}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-800 font-bold tracking-wider">
                              🔑 {s.access_code}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {s.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => setEditingStaff(s)}
                                className="text-xs font-semibold text-emerald-700 hover:underline"
                              >
                                Edit / Reset PIN
                              </button>
                              <button
                                onClick={() => handleToggleActive(s)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                              >
                                {s.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="text-xs font-semibold text-rose-600 hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : tab === 'analytics' ? (
          <div className="space-y-6 fade-up">
            <MetricsStrip {...metrics} />
            <ReportsPanel />
          </div>
        ) : (
          <div className="fade-up">
            <QrSettingsTab />
          </div>
        )}
      </main>

      {showAddModal && (
        <StaffModal
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            loadStaff()
          }}
        />
      )}

      {editingStaff && (
        <StaffModal
          staffMember={editingStaff}
          departments={departments}
          onClose={() => setEditingStaff(null)}
          onSaved={() => {
            setEditingStaff(null)
            loadStaff()
          }}
        />
      )}
    </div>
  )
}

function RoleBadge({ role }) {
  const map = {
    admin: 'bg-purple-100 text-purple-800',
    reception: 'bg-amber-100 text-amber-800',
    doctor: 'bg-sky-100 text-sky-800',
    pharmacist: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${map[role] || 'bg-slate-100 text-slate-600'}`}>
      {role}
    </span>
  )
}

function StaffModal({ staffMember, departments, onClose, onSaved }) {
  const [name, setName] = useState(staffMember?.name || '')
  const [role, setRole] = useState(staffMember?.role || 'reception')
  const [accessCode, setAccessCode] = useState(staffMember?.access_code || '')
  const [departmentId, setDepartmentId] = useState(staffMember?.department_id || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setErr('Full name is required.')
    if (!accessCode.trim() || accessCode.length < 2) return setErr('Enter a valid access code.')
    setBusy(true)

    try {
      const payload = {
        name: name.trim(),
        role,
        access_code: accessCode.trim().toUpperCase(),
        department_id: role === 'doctor' && departmentId ? departmentId : null,
      }

      if (staffMember) {
        await updateStaff(staffMember.id, payload)
      } else {
        await addStaff(payload)
      }
      onSaved()
    } catch (e2) {
      console.error(e2)
      setErr('Failed to save staff member.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {staffMember ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Sunita Patel"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Staff Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input w-full">
              <option value="reception">Reception Desk / DEO</option>
              <option value="doctor">OPD Doctor</option>
              <option value="pharmacist">Pharmacist (Dawa Vitran)</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {role === 'doctor' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Assigned OPD Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="input w-full"
              >
                <option value="">Select OPD Department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Access Code (Alphanumeric / PIN)</label>
            <input
              value={accessCode}
              maxLength={16}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="e.g. 4321 or DOC-101"
              className="input w-full font-mono text-lg font-bold uppercase"
            />
          </div>

          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QrSettingsTab() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const checkinUrl = `${origin}/checkin`

  function downloadQR() {
    const canvas = document.getElementById('qr-hires-admin')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'opd-checkin-counter-qr.png'
    a.click()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Hospital Counter QR Code Poster</h2>
        <p className="mt-1 text-sm text-slate-500">
          Print and display this QR code at reception counters and OPD waiting halls.
          Patients scan this to check in on their mobile device.
        </p>

        <div className="mt-6 flex flex-col items-center">
          <div className="rounded-3xl border-4 border-emerald-600 p-6 bg-white shadow-lg text-center">
            <QRCodeCanvas value={checkinUrl} size={220} includeMargin level="M" />
            <p className="mt-3 text-xs font-bold text-slate-800 uppercase tracking-widest">
              Scan to Check In · OPD Queue
            </p>
          </div>

          <div style={{ display: 'none' }}>
            <QRCodeCanvas id="qr-hires-admin" value={checkinUrl} size={1024} includeMargin level="M" />
          </div>

          <button
            onClick={downloadQR}
            className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition"
          >
            Download High-Res PNG Poster
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">OPD Counter Instructions</h2>
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <span>Place the QR poster at the main hospital entrance and reception desk.</span>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <span>Patients select their OPD Department directly or choose "Need Help / Reception".</span>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
            <span>Patients selecting a department bypass reception and join the doctor queue directly.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
