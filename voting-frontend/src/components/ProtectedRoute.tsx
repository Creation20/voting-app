import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSuperuser?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false, requireSuperuser = false }: Props) {
  const { isAuthenticated, isAdmin, isSuperuser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireSuperuser && !isSuperuser) return <Navigate to="/vote" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/vote" replace />

  return <>{children}</>
}