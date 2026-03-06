import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const color = localStorage.getItem('theme-color') || 'purple'
    const mode  = localStorage.getItem('theme-mode')  || 'dark'
    document.documentElement.setAttribute('data-theme', `${color}-${mode}`)
  }, [])

  if (isAuthenticated) return <Navigate to="/vote" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/vote')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid username or password.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md fade-up relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm mb-6 text-2xl font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg)', boxShadow: '0 0 40px color-mix(in srgb, var(--accent) 35%, transparent)' }}>
            ✦
          </div>
          <h1 className="display-font text-4xl font-black mb-2" style={{ color: 'var(--cream)' }}>VoteApp</h1>
          <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Secure Democratic Voting
          </p>
        </div>

        <div className="glass-card p-8">
          <h2 className="display-font text-xl font-bold mb-6" style={{ color: 'var(--cream)' }}>Sign In to Vote</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Username
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input-field" placeholder="Enter your username" required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="Enter your password" required />
            </div>
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
                style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>
                <span>⚠</span> {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-accent w-full py-3.5 text-base mt-2">
              {loading
                ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Authenticating…</>
                : 'Sign In →'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>
          Contact your administrator if you need an account
        </p>
      </div>
    </div>
  )
}