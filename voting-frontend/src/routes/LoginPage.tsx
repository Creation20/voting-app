import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { lookupOrgByCode } from '../api/elections'
import axios from 'axios'

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login
  const [lUsername, setLUsername] = useState('')
  const [lPassword, setLPassword] = useState('')

  // Register
  const [rUsername, setRUsername] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPassword, setRPassword] = useState('')
  const [rJoinCode, setRJoinCode] = useState('')
  const [orgPreview, setOrgPreview] = useState<{ name: string; org_type: string } | null>(null)
  const [codeChecking, setCodeChecking] = useState(false)

  useEffect(() => {
    const color = localStorage.getItem('theme-color') || 'purple'
    const mode = localStorage.getItem('theme-mode') || 'dark'
    document.documentElement.setAttribute('data-theme', `${color}-${mode}`)
  }, [])

  // Live join code lookup
  useEffect(() => {
    if (rJoinCode.length !== 8) { setOrgPreview(null); return }
    setCodeChecking(true)
    lookupOrgByCode(rJoinCode)
      .then(setOrgPreview)
      .catch(() => setOrgPreview(null))
      .finally(() => setCodeChecking(false))
  }, [rJoinCode])

  if (isAuthenticated) return <Navigate to="/vote" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(lUsername, lPassword); navigate('/vote') }
    catch (err) {
      setError(axios.isAxiosError(err) && err.response?.status === 401
        ? 'Invalid username or password.' : 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await register(rUsername, rEmail, rPassword, rJoinCode); navigate('/vote') }
    catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data
        const msg = Object.entries(d).map(([k, v]) => `${Array.isArray(v) ? v.join(', ') : v}`).join(' ')
        setError(msg)
      } else { setError('Registration failed. Please try again.') }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md fade-up relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm mb-4 text-2xl font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg)', boxShadow: '0 0 40px color-mix(in srgb, var(--accent) 35%, transparent)' }}>
            ✦
          </div>
          <h1 className="display-font text-4xl font-black mb-1" style={{ color: 'var(--cream)' }}>VoteApp</h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Secure Democratic Voting</p>
        </div>

        <div className="glass-card overflow-hidden">
          {/* Tabs */}
          <div className="flex" style={{ borderBottom: '1px solid var(--card-border)' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className="flex-1 py-3.5 text-sm font-semibold capitalize transition-all"
                style={{
                  background: tab === t ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  color: tab === t ? 'var(--accent)' : 'var(--muted)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                {t === 'login' ? 'Sign In' : 'Join Organisation'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm mb-4"
                style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>
                <span>⚠</span> {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Username</label>
                  <input type="text" className="input-field" placeholder="Enter your username"
                    value={lUsername} onChange={e => setLUsername(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Password</label>
                  <input type="password" className="input-field" placeholder="Enter your password"
                    value={lPassword} onChange={e => setLPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-accent w-full py-3.5 text-base mt-2">
                  {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in…</> : 'Sign In →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Join code first — org preview */}
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                    Organisation Join Code *
                  </label>
                  <input className="input-field tracking-widest uppercase" placeholder="e.g. ABC12345" maxLength={8}
                    value={rJoinCode} onChange={e => setRJoinCode(e.target.value.toUpperCase())} required />
                  {codeChecking && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Checking…</p>}
                  {orgPreview && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-sm"
                      style={{ background: 'color-mix(in srgb, var(--success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }}>
                      <span style={{ color: 'var(--success)' }}>✓</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{orgPreview.name}</span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>· {orgPreview.org_type}</span>
                    </div>
                  )}
                  {rJoinCode.length === 8 && !orgPreview && !codeChecking && (
                    <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Invalid or inactive join code.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Username *</label>
                  <input className="input-field" placeholder="Choose a username"
                    value={rUsername} onChange={e => setRUsername(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Email *</label>
                  <input type="email" className="input-field" placeholder="your@email.com"
                    value={rEmail} onChange={e => setREmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Password *</label>
                  <input type="password" className="input-field" placeholder="Min 8 characters"
                    value={rPassword} onChange={e => setRPassword(e.target.value)} required minLength={8} />
                </div>
                <button type="submit" disabled={loading || !orgPreview} className="btn-accent w-full py-3.5 text-base mt-2">
                  {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account…</> : 'Create Account →'}
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
          Need a join code? Contact your organisation administrator.
        </p>
      </div>
    </div>
  )
}