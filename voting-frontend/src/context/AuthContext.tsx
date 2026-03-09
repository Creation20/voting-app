import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import { login as apiLogin, register as apiRegister, storeTokens, clearTokens, getAccessToken } from '../api/auth'

interface JWTPayload {
  user_id: number
  username: string
  email: string
  role: string
  org_id: number | null
  org_name: string | null
  exp: number
}

interface User {
  id: number
  username: string
  email: string
  role: string
  org_id: number | null
  org_name: string | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isOrgOwner: boolean
  isSuperuser: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, joinCode: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function decodeUser(token: string): User | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token)
    if (decoded.exp * 1000 <= Date.now()) return null
    return {
      id: decoded.user_id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      org_id: decoded.org_id ?? null,
      org_name: decoded.org_name ?? null,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (token) {
      const u = decodeUser(token)
      if (u) setUser(u)
      else clearTokens()
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password)
    storeTokens(data.access, data.refresh)
    setUser(decodeUser(data.access)!)
  }

  const register = async (username: string, email: string, password: string, joinCode: string) => {
    const data = await apiRegister(username, email, password, joinCode)
    storeTokens(data.access, data.refresh)
    setUser(decodeUser(data.access)!)
  }

  const logout = () => { clearTokens(); setUser(null) }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN' || user?.role === 'ORG_OWNER' || user?.role === 'SUPERUSER',
      isOrgOwner: user?.role === 'ORG_OWNER' || user?.role === 'SUPERUSER',
      isSuperuser: user?.role === 'SUPERUSER',
      loading,
      login,
      register,
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