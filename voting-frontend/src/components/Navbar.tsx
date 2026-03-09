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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  if (!user) return null

  // ── Role-scoped nav links ──────────────────────────────────────────────────
  // SUPERUSER  → only the platform Control Centre (org-scoped pages are irrelevant)
  // ORG_OWNER  → Vote + all admin pages + Organisation settings
  // ADMIN      → Vote + Dashboard + Elections + Results + Voters + Audit
  // USER       → Vote only
  // ─────────────────────────────────────────────────────────────────────────

  let navLinks: { to: string; label: string }[] = []

  if (isSuperuser) {
    navLinks = [
      { to: '/superuser', label: '⚡ Control Centre' },
    ]
  } else if (isOrgOwner) {
    navLinks = [
      { to: '/vote',            label: 'Vote'         },
      { to: '/admin/dashboard', label: 'Dashboard'    },
      { to: '/admin/results',   label: 'Results'      },
      { to: '/admin/manage',    label: 'Elections'    },
      { to: '/admin/voters',    label: 'Voters'       },
      { to: '/admin/audit',     label: 'Audit'        },
      { to: '/org',             label: 'Organisation' },
    ]
  } else if (isAdmin) {
    navLinks = [
      { to: '/vote',            label: 'Vote'      },
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/results',   label: 'Results'   },
      { to: '/admin/manage',    label: 'Elections' },
      { to: '/admin/voters',    label: 'Voters'    },
      { to: '/admin/audit',     label: 'Audit'     },
    ]
  } else {
    navLinks = [
      { to: '/vote', label: 'Vote' },
    ]
  }

  // Role badge
  const roleBadge = isSuperuser
    ? { label: '⚡ SUPERUSER', color: '#f59e0b' }
    : isOrgOwner
    ? { label: 'OWNER', color: 'var(--accent)' }
    : isAdmin
    ? { label: 'ADMIN', color: 'var(--accent)' }
    : null

  const accentColor = isSuperuser ? '#f59e0b' : 'var(--accent)'

  return (
    <header
      style={{
        borderBottom: '1px solid var(--card-border)',
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        backdropFilter: 'blur(20px)',
      }}
      className="sticky top-0 z-50 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link to={isSuperuser ? '/superuser' : '/'} className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center text-base font-bold"
            style={{ background: accentColor, color: 'var(--bg)' }}
          >
            ✦
          </div>
          <div>
            <span className="display-font text-xl font-bold" style={{ color: 'var(--cream)' }}>
              VoteApp
            </span>
            {isSuperuser ? (
              <span className="hidden sm:inline text-xs ml-2" style={{ color: '#f59e0b', opacity: 0.8 }}>
                · Platform
              </span>
            ) : user.org_name ? (
              <span className="hidden sm:inline text-xs ml-2" style={{ color: 'var(--muted)' }}>
                · {user.org_name}
              </span>
            ) : null}
          </div>
        </Link>

        {/* ── Nav links ── */}
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="px-3 py-2 text-xs font-semibold rounded-sm transition-all whitespace-nowrap tracking-wide"
              style={{
                color: isActive(to) ? accentColor : 'var(--muted)',
                background: isActive(to)
                  ? `color-mix(in srgb, ${accentColor} 12%, transparent)`
                  : 'transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme switcher */}
          <div className="theme-switcher">
            {SWATCHES.map(s => (
              <button
                key={s.color}
                className={`theme-swatch ${s.color} ${color === s.color ? 'active' : ''}`}
                title={s.label}
                onClick={() => handleColor(s.color)}
              />
            ))}
            <button className={`mode-toggle ${mode === 'light' ? 'light' : ''}`} onClick={handleMode} />
          </div>

          {/* User info */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold"
              style={{
                background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                color: accentColor,
                border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
              }}
            >
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{user.username}</span>
            {roleBadge && (
              <span
                className="text-xs px-2.5 py-0.5 font-semibold rounded-sm"
                style={{
                  background: `color-mix(in srgb, ${roleBadge.color} 15%, transparent)`,
                  color: roleBadge.color,
                  border: `1px solid color-mix(in srgb, ${roleBadge.color} 35%, transparent)`,
                  letterSpacing: '0.08em',
                }}
              >
                {roleBadge.label}
              </span>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-xs font-medium px-3 py-1.5 rounded-sm transition-all"
            style={{
              color: 'var(--muted)',
              border: '1px solid color-mix(in srgb, var(--muted) 25%, transparent)',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}