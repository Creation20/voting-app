import React, { useEffect, useState } from 'react'
import { getOrgSettings, updateOrgSettings, regenerateJoinCode, getOrgMembers, updateMemberRole, removeMember } from '../api/org'
import type { Organization } from '../api/org'
import type { OrgMember } from '../api/admin'
import { useAuth } from '../context/AuthContext'

type Tab = 'overview' | 'members'
const ORG_TYPES = ['UNIVERSITY', 'HIGH_SCHOOL', 'GOVERNMENT', 'CORPORATE', 'COMMUNITY', 'OTHER']

export default function OrgOwnerPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [oName, setOName] = useState('')
  const [oDesc, setODesc] = useState('')
  const [oType, setOType] = useState('')
  const [oLogo, setOLogo] = useState('')

  const flash = (m: string, isErr = false) => {
    if (isErr) { setError(m); setMsg('') } else { setMsg(m); setError('') }
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const load = async () => {
    try {
      const [o, m] = await Promise.all([getOrgSettings(), getOrgMembers()])
      setOrg(o); setMembers(m)
      setOName(o.name); setODesc(o.description); setOType(o.org_type); setOLogo(o.logo_url)
    } catch { flash('Failed to load organisation data.', true) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const updated = await updateOrgSettings({ name: oName, description: oDesc, org_type: oType, logo_url: oLogo })
      setOrg(updated); flash('Settings saved.')
    } catch { flash('Failed to save settings.', true) }
    finally { setSaving(false) }
  }

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerate join code? The old code will stop working immediately.')) return
    try {
      const { join_code } = await regenerateJoinCode()
      setOrg(prev => prev ? { ...prev, join_code } : prev)
      flash('Join code regenerated.')
    } catch { flash('Failed to regenerate code.', true) }
  }

  const handleRoleChange = async (member: OrgMember, role: string) => {
    try {
      await updateMemberRole(member.id, role)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m))
      flash(`${member.username} is now ${role}.`)
    } catch { flash('Failed to update role.', true) }
  }

  const handleRemoveMember = async (member: OrgMember) => {
    if (!confirm(`Remove ${member.username} from the organisation?`)) return
    try {
      await removeMember(member.id)
      setMembers(prev => prev.filter(m => m.id !== member.id))
      flash(`${member.username} removed.`)
    } catch { flash('Failed to remove member.', true) }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="spinner" /><p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
    </div>
  )

  const roleColor = (role: string) => role === 'ADMIN' ? 'var(--accent)' : role === 'ORG_OWNER' ? '#f59e0b' : 'var(--muted)'

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Organisation Panel</p>
          <span className="badge-accent">OWNER</span>
        </div>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>{org?.name}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{org?.org_type} · {members.length} members · {org?.election_count} elections</p>
      </div>

      {msg && <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm" style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', color: 'var(--success)' }}>✓ {msg}</div>}
      {error && <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm" style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>⚠ {error}</div>}

      <div className="flex gap-1 p-1 rounded-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {(['overview', 'members'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm font-semibold rounded-sm capitalize transition-all"
            style={{ background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'var(--bg)' : 'var(--muted)' }}>
            {t === 'overview' ? '⚙ Settings' : `👥 Members (${members.length})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="glass-card p-6 fade-up-1">
            <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>Join Code</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="px-6 py-3 rounded-sm text-2xl font-bold tracking-widest display-font"
                style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--accent)', letterSpacing: '0.3em' }}>
                {showCode ? org?.join_code : '••••••••'}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCode(!showCode)} className="btn-ghost text-sm">{showCode ? '🙈 Hide' : '👁 Show'}</button>
                {showCode && org?.join_code && (
                  <button onClick={() => { navigator.clipboard.writeText(org.join_code); flash('Copied!') }} className="btn-ghost text-sm">📋 Copy</button>
                )}
                <button onClick={handleRegenerateCode} className="text-xs px-3 py-2 rounded-sm transition-all"
                  style={{ color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)', background: 'transparent' }}>
                  🔄 Regenerate
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 fade-up-2">
            <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Organisation Settings</h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Name *</label>
                <input className="input-field" value={oName} onChange={e => setOName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Type</label>
                <select className="input-field" value={oType} onChange={e => setOType(e.target.value)}>
                  {ORG_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
                <textarea className="input-field" rows={2} value={oDesc} onChange={e => setODesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Logo URL</label>
                <input type="url" className="input-field" placeholder="https://…" value={oLogo} onChange={e => setOLogo(e.target.value)} />
              </div>
              <button type="submit" disabled={saving} className="btn-accent">{saving ? 'Saving…' : 'Save Settings →'}</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="glass-card p-6 fade-up-1">
          <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
            Members <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({members.length})</span>
          </h2>
          {members.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No members yet. Share your join code to get started.</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-sm flex-wrap gap-3"
                  style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--card-border)' }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--cream)' }}>{m.username}</span>
                      <span className="text-xs px-2 py-0.5 rounded-sm font-semibold"
                        style={{ color: roleColor(m.role), background: 'color-mix(in srgb, currentColor 10%, transparent)', border: '1px solid color-mix(in srgb, currentColor 25%, transparent)' }}>
                        {m.role}
                      </span>
                      {m.id === user?.id && <span className="text-xs" style={{ color: 'var(--muted)' }}>(you)</span>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{m.email}</p>
                  </div>
                  {m.id !== user?.id && m.role !== 'ORG_OWNER' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleRoleChange(m, m.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                        className="text-xs px-3 py-1.5 rounded-sm transition-all"
                        style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                        {m.role === 'ADMIN' ? 'Demote to Voter' : 'Promote to Admin'}
                      </button>
                      <button onClick={() => handleRemoveMember(m)}
                        className="text-xs px-3 py-1.5 rounded-sm transition-all"
                        style={{ color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}