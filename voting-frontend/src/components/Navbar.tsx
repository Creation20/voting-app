import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }
  const isActive = (path: string) => location.pathname === path

  if (!user) return null

  return (
    <header style={{ borderBottom: '1px solid rgba(212,168,67,0.2)', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}
      className="sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center text-base font-bold"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}>✦</div>
          <span className="display-font text-xl font-bold" style={{ color: 'var(--cream)' }}>VoteApp</span>
        </Link>

        <nav className="flex items-center gap-1">
          {[
            { to: '/vote', label: 'Vote' },
            ...(isAdmin ? [{ to: '/admin/results', label: 'Results' }, { to: '/admin/manage', label: 'Manage' }] : []),
          ].map(({ to, label }) => (
            <Link key={to} to={to}
              className="px-4 py-2 text-sm font-medium rounded-sm transition-all duration-150"
              style={{
                color: isActive(to) ? 'var(--gold)' : 'var(--muted)',
                background: isActive(to) ? 'rgba(212,168,67,0.1)' : 'transparent',
              }}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--navy-light)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,0.3)' }}>
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{user.username}</span>
            {isAdmin && <span className="badge-gold">ADMIN</span>}
          </div>
          <button onClick={handleLogout}
            className="text-xs font-medium px-3 py-1.5 rounded-sm transition-all"
            style={{ color: 'var(--muted)', border: '1px solid rgba(138,155,181,0.2)' }}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}