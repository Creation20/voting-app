import React, { useEffect, useState } from 'react'
import { getAuditLog } from '../api/admin'
import type { AuditLog } from '../api/admin'

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'var(--success)', LOGOUT: 'var(--muted)', VOTE_CAST: 'var(--accent)',
  ELECTION_CREATED: '#6366f1', ELECTION_UPDATED: '#6366f1', ELECTION_DELETED: 'var(--danger)',
  CANDIDATE_ADDED: '#f59e0b', CANDIDATE_UPDATED: '#f59e0b', CANDIDATE_DELETED: 'var(--danger)',
  VOTER_UPLOADED: '#ec4899', MEMBER_ROLE_CHANGED: '#60a5fa', MEMBER_REMOVED: 'var(--danger)',
  JOIN_CODE_REGENERATED: '#f59e0b', ORG_SETTINGS_UPDATED: '#60a5fa', LOGIN_FAILED: 'var(--danger)',
}
const ACTION_ICONS: Record<string, string> = {
  LOGIN: '🔓', LOGOUT: '🔒', VOTE_CAST: '✦', ELECTION_CREATED: '📋', ELECTION_UPDATED: '✏️',
  ELECTION_DELETED: '🗑', CANDIDATE_ADDED: '➕', CANDIDATE_UPDATED: '✏️', CANDIDATE_DELETED: '🗑',
  VOTER_UPLOADED: '📤', MEMBER_ROLE_CHANGED: '🔄', MEMBER_REMOVED: '👤',
  JOIN_CODE_REGENERATED: '🔑', ORG_SETTINGS_UPDATED: '⚙', LOGIN_FAILED: '⚠',
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  useEffect(() => {
    getAuditLog().then(setLogs).catch(() => setError('Failed to load audit log.')).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="spinner" /><p className="text-sm" style={{ color: 'var(--muted)' }}>Loading audit log…</p>
    </div>
  )

  const actionTypes = [...new Set(logs.map(l => l.action))].sort()
  const filtered = logs.filter(l => {
    const matchesSearch = !filter || (l.username || '').toLowerCase().includes(filter.toLowerCase()) || l.detail.toLowerCase().includes(filter.toLowerCase()) || (l.ip_address || '').includes(filter)
    return matchesSearch && (!actionFilter || l.action === actionFilter)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div className="fade-up">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Audit Log</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{logs.length} events · Showing last 200</p>
      </div>

      {error && <div className="px-4 py-3 rounded-sm text-sm" style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3 fade-up-1">
        <input className="input-field flex-1" placeholder="Search by user, detail, IP…" value={filter} onChange={e => setFilter(e.target.value)} />
        <select className="input-field sm:max-w-xs" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-3 fade-up-2">
        {[
          { label: 'Logins',        count: logs.filter(l => l.action === 'LOGIN').length,                                             color: 'var(--success)' },
          { label: 'Votes',         count: logs.filter(l => l.action === 'VOTE_CAST').length,                                         color: 'var(--accent)'  },
          { label: 'Failed Logins', count: logs.filter(l => l.action === 'LOGIN_FAILED').length,                                      color: 'var(--danger)'  },
          { label: 'Deletions',     count: logs.filter(l => l.action.includes('DELETED') || l.action === 'MEMBER_REMOVED').length,    color: '#f59e0b'        },
        ].map(({ label, count, color }) => (
          <div key={label} className="px-4 py-2 rounded-sm flex items-center gap-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <span className="text-lg font-black display-font" style={{ color }}>{count}</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden fade-up-3">
        {filtered.length === 0 ? (
          <div className="p-10 text-center" style={{ color: 'var(--muted)' }}>No log entries match your filters.</div>
        ) : (
          <div className="divide-y" style={{ '--divide-color': 'color-mix(in srgb, var(--card-border) 50%, transparent)' } as any}>
            {filtered.map(log => {
              const color = ACTION_COLORS[log.action] || 'var(--muted)'
              const icon = ACTION_ICONS[log.action] || '·'
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="shrink-0 w-8 h-8 rounded-sm flex items-center justify-center text-sm mt-0.5"
                    style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-bold tracking-wider" style={{ color }}>{log.action.replace(/_/g, ' ')}</span>
                      {log.username && <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--muted) 10%, transparent)', color: 'var(--muted)' }}>{log.username}</span>}
                    </div>
                    {log.detail && <p className="text-sm" style={{ color: 'var(--muted)' }}>{log.detail}</p>}
                    <div className="flex gap-3 mt-1 text-xs" style={{ color: 'color-mix(in srgb, var(--muted) 60%, transparent)' }}>
                      <span>{new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}</span>
                      {log.ip_address && <span>· {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}