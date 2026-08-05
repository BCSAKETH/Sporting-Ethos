import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import PatientCheckIn from './pages/PatientCheckIn.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Expert from './pages/Expert.jsx'
import Pharmacy from './pages/Pharmacy.jsx'
import Admin from './pages/Admin.jsx'
import Wards from './pages/Wards.jsx'
import AccessGate from './pages/AccessGate.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Reception Desk */}
        <Route path="/" element={<AccessGate requiredRole="reception"><Dashboard /></AccessGate>} />

        {/* Doctor OPD Console */}
        <Route path="/expert" element={<AccessGate requiredRole="doctor"><Expert /></AccessGate>} />

        {/* Pharmacy Console */}
        <Route path="/pharmacy" element={<AccessGate requiredRole="pharmacist"><Pharmacy /></AccessGate>} />

        {/* Admin Command Centre */}
        <Route path="/admin" element={<AccessGate requiredRole="admin"><Admin /></AccessGate>} />

        {/* Inpatient Ward & Bed Management */}
        <Route path="/wards" element={<AccessGate requiredRole="doctor"><Wards /></AccessGate>} />

        {/* Patient self check-in — reached by scanning the counter QR code (Public) */}
        <Route path="/checkin" element={<PatientCheckIn />} />

        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
