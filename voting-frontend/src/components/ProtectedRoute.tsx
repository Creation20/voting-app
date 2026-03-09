import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
  requireOrgOwner?: boolean
  requireSuperuser?: boolean
  /** If true, redirect superusers to /superuser even if they pass role checks */
  blockSuperuser?: boolean
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireOrgOwner = false,
  requireSuperuser = false,
  blockSuperuser = false,
}: Props) {
  const { isAuthenticated, isAdmin, isOrgOwner, isSuperuser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    )
  }

  // Not logged in → login page
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Superuser trying to access an org-scoped page → redirect to their panel
  if (blockSuperuser && isSuperuser) return <Navigate to="/superuser" replace />

  // Role guards
  if (requireSuperuser && !isSuperuser) return <Navigate to="/vote" replace />
  if (requireOrgOwner && !isOrgOwner) return <Navigate to="/vote" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/vote" replace />

  return <>{children}</>
}