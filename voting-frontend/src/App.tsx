import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './routes/LoginPage'
import CandidateListPage from './routes/CandidateListPage'
import AdminResultsPage from './routes/AdminResultsPage'
import AdminManagePage from './routes/AdminManagePage'
import AdminDashboardPage from './routes/AdminDashboardPage'
import AdminVotersPage from './routes/AdminVotersPage'
import AdminAuditLogPage from './routes/AdminauditlogPage'
import SuperuserPage from './routes/SuperuserPage'
import OrgOwnerPage from './routes/OrgOwnerPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/vote" element={<ProtectedRoute><CandidateListPage /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute requireAdmin><AdminResultsPage /></ProtectedRoute>} />
              <Route path="/admin/manage" element={<ProtectedRoute requireAdmin><AdminManagePage /></ProtectedRoute>} />
              <Route path="/admin/voters" element={<ProtectedRoute requireAdmin><AdminVotersPage /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute requireAdmin><AdminAuditLogPage /></ProtectedRoute>} />
              <Route path="/org" element={<ProtectedRoute requireOrgOwner><OrgOwnerPage /></ProtectedRoute>} />
              <Route path="/superuser" element={<ProtectedRoute requireSuperuser><SuperuserPage /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/vote" replace />} />
              <Route path="*" element={<Navigate to="/vote" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}