import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminDashboard, getAdminElections } from '../api/admin'
import type { DashboardStats } from '../api/admin'
import type { Election } from '../api/elections'

const StatCard = ({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) => (
  <div className="glass-card p-6 flex flex-col gap-2">
    <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{label}</p>
    <p className="display-font text-4xl font-black" style={{ color }}>{value}</p>
    {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
  </div>
)

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAdminDashboard(), getAdminElections()])
      .then(([s, e]) => { setStats(s); setElections(e) })
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="spinner" />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading dashboard…</p>
      </div>
    )
  }

  const activeElections = elections.filter(e => e.status === 'ACTIVE')
  const draftElections = elections.filter(e => e.status === 'DRAFT')

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="fade-up">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Overview of your organisation's elections and voters</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-sm text-sm"
          style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 fade-up-1">
          <StatCard label="Total Voters"     value={stats.total_voters}        color="var(--accent)" />
          <StatCard label="Total Votes"      value={stats.total_votes}         color="#6366f1" />
          <StatCard label="Active Elections" value={stats.active_elections}    color="var(--success)" />
          <StatCard label="All Elections"    value={stats.total_elections}     color="var(--cream)" />
          <StatCard label="Turnout"          value={`${stats.voter_turnout_pct}%`} color="#f59e0b" sub="of registered voters" />
          <StatCard label="Votes Today"      value={stats.recent_votes}        color="#ec4899" sub="last 24 hours" />
        </div>
      )}

      {stats && stats.total_voters > 0 && (
        <div className="glass-card p-6 fade-up-2">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Voter Turnout</p>
            <span className="display-font text-2xl font-black" style={{ color: 'var(--accent)' }}>
              {stats.voter_turnout_pct}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--muted) 15%, transparent)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(stats.voter_turnout_pct, 100)}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-lt))' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            {stats.total_votes} votes out of {stats.total_voters} registered voters
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-up-3">
        {[
          { label: 'Manage Elections', desc: 'Create, edit, start/stop elections', to: '/admin/manage', icon: '🗳' },
          { label: 'Manage Voters',    desc: 'Upload CSV, view voter list',        to: '/admin/voters', icon: '👥' },
          { label: 'View Results',     desc: 'Charts and detailed breakdown',      to: '/admin/results', icon: '📊' },
          { label: 'Audit Log',        desc: 'Security and activity trail',        to: '/admin/audit',  icon: '🔍' },
        ].map(({ label, desc, to, icon }) => (
          <Link key={to} to={to}
            className="glass-card p-5 flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02]"
            style={{ textDecoration: 'none' }}>
            <span className="text-2xl">{icon}</span>
            <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
          </Link>
        ))}
      </div>

      {activeElections.length > 0 && (
        <div className="glass-card p-6 fade-up-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="pulse-dot" />
            <h2 className="display-font text-lg font-bold" style={{ color: 'var(--cream)' }}>
              Live Elections ({activeElections.length})
            </h2>
          </div>
          <div className="space-y-3">
            {activeElections.map(el => {
              const votes = el.total_votes ?? 0
              const voters = el.voter_count ?? 1
              const pct = voters > 0 ? Math.round(votes / voters * 100) : 0
              return (
                <div key={el.id} className="p-4 rounded-sm"
                  style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{el.title}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        Closes {new Date(el.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--muted) 15%, transparent)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{votes} votes cast</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {draftElections.length > 0 && (
        <div className="px-5 py-4 rounded-sm flex items-center gap-3"
          style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
          <span style={{ color: '#f59e0b' }}>⚠</span>
          <p className="text-sm" style={{ color: '#f59e0b' }}>
            You have {draftElections.length} draft election{draftElections.length > 1 ? 's' : ''} not yet active.{' '}
            <Link to="/admin/manage" style={{ textDecoration: 'underline' }}>Manage elections →</Link>
          </p>
        </div>
      )}
    </div>
  )
}