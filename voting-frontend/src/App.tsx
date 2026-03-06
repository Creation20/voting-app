import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './routes/LoginPage'
import CandidateListPage from './routes/CandidateListPage'
import AdminResultsPage from './routes/AdminResultsPage'
import AdminManagePage from './routes/AdminManagePage'
import SuperuserPage from './routes/SuperUserPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/vote" element={<ProtectedRoute><CandidateListPage /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute requireAdmin><AdminResultsPage /></ProtectedRoute>} />
              <Route path="/admin/manage" element={<ProtectedRoute requireAdmin><AdminManagePage /></ProtectedRoute>} />
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