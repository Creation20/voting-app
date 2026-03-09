import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type ThemeColor = 'purple' | 'green' | 'red' | 'blue'
type ThemeMode = 'dark' | 'light'

const SWATCHES: { color: ThemeColor; label: string }[] = [
  { color: 'purple', label: 'Purple' },
  { color: 'green', label: 'Green' },
  { color: 'red', label: 'Red' },
  { color: 'blue', label: 'Blue' },
]

function applyTheme(color: ThemeColor, mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', `${color}-${mode}`)
  localStorage.setItem('theme-color', color)
  localStorage.setItem('theme-mode', mode)
}

export default function Navbar() {
  const { user, isAdmin, isOrgOwner, isSuperuser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [color, setColor] = useState<ThemeColor>('purple')
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    const savedColor = (localStorage.getItem('theme-color') as ThemeColor) || 'purple'
    const savedMode = (localStorage.getItem('theme-mode') as ThemeMode) || 'dark'
    setColor(savedColor); setMode(savedMode)
    applyTheme(savedColor, savedMode)
  }, [])

  const handleColor = (c: ThemeColor) => { setColor(c); applyTheme(c, mode) }
  const handleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next); applyTheme(color, next)
  }

  const isActive = (path: string) => location.pathname === path
  if (!user) return null

  const navLinks = [
    { to: '/vote', label: 'Vote' },
    ...(isAdmin ? [{ to: '/admin/results', label: 'Results' }, { to: '/admin/manage', label: 'Manage' }] : []),
    ...(isOrgOwner ? [{ to: '/org', label: 'Organisation' }] : []),
    ...(isSuperuser ? [{ to: '/superuser', label: 'Superuser' }] : []),
  ]

  return (
    <header style={{ borderBottom: '1px solid var(--card-border)', background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(20px)' }}
      className="sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center text-base font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>✦</div>
          <div>
            <span className="display-font text-xl font-bold" style={{ color: 'var(--cream)' }}>VoteApp</span>
            {user.org_name && (
              <span className="hidden sm:inline text-xs ml-2" style={{ color: 'var(--muted)' }}>· {user.org_name}</span>
            )}
          </div>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to}
              className="px-3 py-2 text-sm font-medium rounded-sm transition-all whitespace-nowrap"
              style={{
                color: isActive(to) ? 'var(--accent)' : 'var(--muted)',
                background: isActive(to) ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
              }}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="theme-switcher">
            {SWATCHES.map(s => (
              <button key={s.color} className={`theme-swatch ${s.color} ${color === s.color ? 'active' : ''}`}
                title={s.label} onClick={() => handleColor(s.color)} />
            ))}
            <button className={`mode-toggle ${mode === 'light' ? 'light' : ''}`} onClick={handleMode} />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--bg-light)', color: 'var(--accent)', border: '1px solid var(--card-border)' }}>
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{user.username}</span>
            {isSuperuser && <span className="badge-accent">⚡ SUPER</span>}
            {isOrgOwner && !isSuperuser && <span className="badge-accent">OWNER</span>}
            {isAdmin && !isOrgOwner && <span className="badge-accent">ADMIN</span>}
          </div>

          <button onClick={() => { logout(); navigate('/login') }}
            className="text-xs font-medium px-3 py-1.5 rounded-sm transition-all"
            style={{ color: 'var(--muted)', border: '1px solid color-mix(in srgb, var(--muted) 25%, transparent)' }}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}