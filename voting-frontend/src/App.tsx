import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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

// Smart default redirect based on role
function DefaultRedirect() {
  const { isSuperuser, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isSuperuser) return <Navigate to="/superuser" replace />
  return <Navigate to="/vote" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
          <Navbar />
          <main>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Voter */}
              <Route path="/vote" element={
                <ProtectedRoute blockSuperuser>
                  <CandidateListPage />
                </ProtectedRoute>
              } />

              {/* Admin (ADMIN + ORG_OWNER only — not superuser) */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requireAdmin blockSuperuser>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/results" element={
                <ProtectedRoute requireAdmin blockSuperuser>
                  <AdminResultsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/manage" element={
                <ProtectedRoute requireAdmin blockSuperuser>
                  <AdminManagePage />
                </ProtectedRoute>
              } />
              <Route path="/admin/voters" element={
                <ProtectedRoute requireAdmin blockSuperuser>
                  <AdminVotersPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/audit" element={
                <ProtectedRoute requireAdmin blockSuperuser>
                  <AdminAuditLogPage />
                </ProtectedRoute>
              } />

              {/* Org Owner */}
              <Route path="/org" element={
                <ProtectedRoute requireOrgOwner blockSuperuser>
                  <OrgOwnerPage />
                </ProtectedRoute>
              } />

              {/* Superuser — exclusively theirs */}
              <Route path="/superuser" element={
                <ProtectedRoute requireSuperuser>
                  <SuperuserPage />
                </ProtectedRoute>
              } />

              {/* Catch-all: smart redirect based on role */}
              <Route path="/" element={<DefaultRedirect />} />
              <Route path="*" element={<DefaultRedirect />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}