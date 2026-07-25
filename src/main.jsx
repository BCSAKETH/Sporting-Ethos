import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import PatientCheckIn from './pages/PatientCheckIn.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Expert from './pages/Expert.jsx'
import Pharmacy from './pages/Pharmacy.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* One dashboard — the expert / reception command centre. */}
        <Route path="/" element={<Dashboard />} />
        {/* Expert console — credential-gated. */}
        <Route path="/expert" element={<Expert />} />
        {/* Pharmacy — counter + inventory, credential-gated. */}
        <Route path="/pharmacy" element={<Pharmacy />} />
        {/* Patient check-in — reached by scanning the universal QR. */}
        <Route path="/checkin" element={<PatientCheckIn />} />
        {/* Legacy path redirects to the single dashboard. */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
