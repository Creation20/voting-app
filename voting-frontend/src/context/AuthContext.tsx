import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import { login as apiLogin, storeTokens, clearTokens, getAccessToken } from '../api/auth'

interface JWTPayload {
  user_id: number
  username: string
  email: string
  role: string
  exp: number
}

interface User {
  id: number
  username: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isSuperuser: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (token) {
      try {
        const decoded = jwtDecode<JWTPayload>(token)
        if (decoded.exp * 1000 > Date.now()) {
          setUser({ id: decoded.user_id, username: decoded.username, email: decoded.email, role: decoded.role })
        } else {
          clearTokens()
        }
      } catch {
        clearTokens()
      }
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password)
    storeTokens(data.access, data.refresh)
    const decoded = jwtDecode<JWTPayload>(data.access)
    setUser({ id: decoded.user_id, username: decoded.username, email: decoded.email, role: decoded.role })
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPERUSER',
      isSuperuser: user?.role === 'SUPERUSER',
      loading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}