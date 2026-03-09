import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  superuserGetElections, superuserCreateElection, superuserUpdateElection, superuserDeleteElection,
  superuserGetResults, superuserGetCandidates, superuserCreateCandidate,
  superuserUpdateCandidate, superuserDeleteCandidate,
  superuserGetOrgs, superuserCreateOrg, superuserUpdateOrg, superuserDeleteOrg,
  superuserGetDashboard,
  Election, Candidate, ResultsResponse, Organization, SuperuserStats,
} from '../api/elections'
import axios from 'axios'

const COLORS_STATIC = ['#a855f7', '#6366f1', '#34d399', '#f59e0b', '#ec4899', '#60a5fa']
const ORG_TYPES = ['UNIVERSITY', 'HIGH_SCHOOL', 'GOVERNMENT', 'CORPORATE', 'COMMUNITY', 'OTHER']

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
function futureLocal(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
function toISO(val: string) {
  return val ? new Date(val).toISOString() : ''
}

type Tab = 'platform' | 'orgs' | 'elections' | 'candidates' | 'results'

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (
      <div className="px-4 py-3 rounded-sm text-sm"
        style={{ background: 'var(--bg-mid)', border: '1px solid var(--card-border)' }}>
        <p className="font-bold mb-1" style={{ color: 'var(--cream)' }}>{d.name}</p>
        <p style={{ color: 'var(--accent)' }}>{d.vote_count} votes · {d.percentage}%</p>
      </div>
    )
  }
  return null
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '○ Draft', color: 'var(--muted)' },
  { value: 'ACTIVE', label: '● Active', color: 'var(--success)' },
  { value: 'PAUSED', label: '⏸ Paused', color: '#f59e0b' },
  { value: 'ENDED', label: '✕ Ended', color: 'var(--danger)' },
]

export default function SuperuserPage() {
  const [tab, setTab] = useState<Tab>('platform')
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [platformStats, setPlatformStats] = useState<SuperuserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Election form
  const [editingElectionId, setEditingElectionId] = useState<number | null>(null)
  const [eTitle, setETitle] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eStart, setEStart] = useState(nowLocal())
  const [eEnd, setEEnd] = useState(futureLocal(7))
  const [eStatus, setEStatus] = useState('DRAFT')
  const [eSaving, setESaving] = useState(false)

  // Candidate form
  const [editingCandidateId, setEditingCandidateId] = useState<number | null>(null)
  const [cElection, setCElection] = useState<number | ''>('')
  const [cName, setCName] = useState('')
  const [cParty, setCParty] = useState('')
  const [cPosition, setCPosition] = useState('')
  const [cMotto, setCMotto] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cPhotoUrl, setCPhotoUrl] = useState('')
  const [cManifesto, setCManifesto] = useState('')
  const [cSaving, setCSaving] = useState(false)

  // Org form
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null)
  const [oName, setOName] = useState('')
  const [oType, setOType] = useState('OTHER')
  const [oDesc, setODesc] = useState('')
  const [oOwnerUsername, setOOwnerUsername] = useState('')
  const [oOwnerEmail, setOOwnerEmail] = useState('')
  const [oOwnerPassword, setOOwnerPassword] = useState('')
  const [oSaving, setOSaving] = useState(false)

  // Results
  const [resultsElectionId, setResultsElectionId] = useState<number | null>(null)
  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  const flash = (m: string, isErr = false) => {
    if (isErr) { setError(m); setMsg('') } else { setMsg(m); setError('') }
    setTimeout(() => { setMsg(''); setError('') }, 5000)
  }

  const load = async () => {
    try {
      const [e, c, o, s] = await Promise.all([
        superuserGetElections(),
        superuserGetCandidates(),
        superuserGetOrgs(),
        superuserGetDashboard(),
      ])
      setElections(e); setCandidates(c); setOrgs(o); setPlatformStats(s)
      if (e.length > 0) {
        if (!cElection) setCElection(e[0].id)
        if (!resultsElectionId) setResultsElectionId(e[0].id)
      }
    } catch {
      flash('Failed to load data.', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (tab !== 'results' || !resultsElectionId) return
    setResultsLoading(true)
    superuserGetResults(resultsElectionId)
      .then(setResults)
      .catch(() => flash('Failed to load results.', true))
      .finally(() => setResultsLoading(false))
  }, [tab, resultsElectionId])

  // ── Org handlers ──
  const resetOrgForm = () => {
    setEditingOrgId(null)
    setOName(''); setOType('OTHER'); setODesc('')
    setOOwnerUsername(''); setOOwnerEmail(''); setOOwnerPassword('')
  }

  const startEditOrg = (org: Organization) => {
    setEditingOrgId(org.id)
    setOName(org.name); setOType(org.org_type); setODesc(org.description)
    setOOwnerUsername(''); setOOwnerEmail(''); setOOwnerPassword('')
    setTab('orgs')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault(); setOSaving(true)
    try {
      if (editingOrgId) {
        await superuserUpdateOrg(editingOrgId, { name: oName, org_type: oType, description: oDesc })
        flash('Organisation updated.')
      } else {
        const payload: any = { name: oName, org_type: oType, description: oDesc }
        if (oOwnerUsername) payload.owner = { username: oOwnerUsername, email: oOwnerEmail, password: oOwnerPassword }
        await superuserCreateOrg(payload)
        flash('Organisation created!')
      }
      resetOrgForm(); load()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data
        flash(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '), true)
      } else { flash('Error saving organisation.', true) }
    } finally { setOSaving(false) }
  }

  const handleDeleteOrg = async (org: Organization) => {
    if (!confirm(`Delete "${org.name}"? All elections and data will be permanently deleted.`)) return
    try { await superuserDeleteOrg(org.id); flash('Organisation deleted.'); load() }
    catch { flash('Failed to delete organisation.', true) }
  }

  // ── Election form handlers ──
  const resetElectionForm = () => {
    setEditingElectionId(null); setETitle(''); setEDesc('')
    setEStart(nowLocal()); setEEnd(futureLocal(7)); setEStatus('DRAFT')
  }

  const startEditElection = (el: Election) => {
    setEditingElectionId(el.id); setETitle(el.title); setEDesc(el.description)
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      return d.toISOString().slice(0, 16)
    }
    setEStart(toLocal(el.start_time)); setEEnd(toLocal(el.end_time))
    setEStatus(el.status || 'DRAFT')
    setTab('elections')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveElection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (new Date(eStart) >= new Date(eEnd)) { flash('End time must be after start time.', true); return }
    setESaving(true)
    const payload = { title: eTitle, description: eDesc, start_time: toISO(eStart), end_time: toISO(eEnd), status: eStatus }
    try {
      if (editingElectionId) {
        await superuserUpdateElection(editingElectionId, payload); flash('Election updated.')
      } else {
        await superuserCreateElection(payload); flash('Election created!')
      }
      resetElectionForm(); load()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data
        flash(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '), true)
      } else { flash('Error saving election.', true) }
    } finally { setESaving(false) }
  }

  const handleDeleteElection = async (id: number, title: string) => {
    if (!confirm(`Delete election "${title}"? All votes and candidates will be lost.`)) return
    try { await superuserDeleteElection(id); flash('Election deleted.'); load() }
    catch { flash('Failed to delete election.', true) }
  }

  // ── Candidate form handlers ──
  const resetCandidateForm = () => {
    setEditingCandidateId(null); setCName(''); setCParty(''); setCPosition('')
    setCMotto(''); setCDesc(''); setCPhotoUrl(''); setCManifesto('')
    if (elections.length > 0) setCElection(elections[0].id)
  }

  const startEditCandidate = (c: Candidate) => {
    setEditingCandidateId(c.id); setCName(c.name); setCParty(c.party)
    setCPosition(c.position || ''); setCMotto(c.motto ?? ''); setCDesc(c.description)
    setCPhotoUrl(c.photo_url || ''); setCManifesto(c.manifesto || '')
    setCElection(c.election)
    setTab('candidates')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cElection) return
    setCSaving(true)
    const payload = {
      name: cName, party: cParty, motto: cMotto, description: cDesc,
      position: cPosition, photo_url: cPhotoUrl, manifesto: cManifesto,
      election: Number(cElection),
    }
    try {
      if (editingCandidateId) {
        await superuserUpdateCandidate(editingCandidateId, payload); flash('Candidate updated.')
      } else {
        await superuserCreateCandidate(payload); flash('Candidate added!')
      }
      resetCandidateForm(); load()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data
        flash(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '), true)
      } else { flash('Error saving candidate.', true) }
    } finally { setCSaving(false) }
  }

  const handleDeleteCandidate = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}"? This cannot be undone.`)) return
    try { await superuserDeleteCandidate(id); flash('Candidate removed.'); load() }
    catch { flash('Failed to delete candidate.', true) }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="spinner" /><p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  const leader = results?.results[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Superuser Panel</p>
          <span className="badge-accent">⚡ SUPERUSER</span>
        </div>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Control Centre</h1>
      </div>

      {msg && <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
        style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', color: 'var(--success)' }}>✓ {msg}</div>}
      {error && <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm"
        style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>⚠ {error}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {([
          ['platform', `🌐 Platform`],
          ['orgs', `🏛 Orgs (${orgs.length})`],
          ['elections', `🗳 Elections (${elections.length})`],
          ['candidates', `👤 Candidates (${candidates.length})`],
          ['results', '📊 Results'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-xs font-semibold rounded-sm transition-all whitespace-nowrap"
            style={{ background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'var(--bg)' : 'var(--muted)', minWidth: 80 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ PLATFORM TAB ══ */}
      {tab === 'platform' && platformStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 fade-up-1">
            {[
              { label: 'Organisations', value: platformStats.total_orgs, color: 'var(--accent)' },
              { label: 'Total Voters', value: platformStats.total_voters, color: '#6366f1' },
              { label: 'Total Votes', value: platformStats.total_votes, color: 'var(--success)' },
              { label: 'Active Elections', value: platformStats.active_elections, color: '#f59e0b' },
              { label: 'All Elections', value: platformStats.total_elections, color: 'var(--cream)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card p-5 text-center">
                <p className="display-font text-4xl font-black mb-1" style={{ color }}>{value}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 fade-up-2">
            <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>Organisations Overview</h2>
            {orgs.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No organisations yet.</p>
            ) : (
              <div className="space-y-2">
                {orgs.slice(0, 10).map(org => (
                  <div key={org.id} className="flex items-center justify-between p-3 rounded-sm"
                    style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--card-border)' }}>
                    <div>
                      <span className="font-medium text-sm" style={{ color: 'var(--cream)' }}>{org.name}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{org.org_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                      <span>{org.member_count} members</span>
                      <span>{org.election_count} elections</span>
                    </div>
                  </div>
                ))}
                {orgs.length > 10 && <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>+{orgs.length - 10} more — go to Orgs tab</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ ORGS TAB ══ */}
      {tab === 'orgs' && (
        <div className="space-y-6">
          <div className="glass-card p-6 fade-up-1">
            <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
              {editingOrgId ? '✏️ Edit Organisation' : '➕ Create Organisation'}
            </h2>
            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Name *</label>
                  <input className="input-field" placeholder="e.g. Kwame University" value={oName} onChange={e => setOName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Type</label>
                  <select className="input-field" value={oType} onChange={e => setOType(e.target.value)}>
                    {ORG_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
                <textarea className="input-field" rows={2} value={oDesc} onChange={e => setODesc(e.target.value)} />
              </div>
              {!editingOrgId && (
                <div className="p-4 rounded-sm space-y-3" style={{ background: 'color-mix(in srgb, var(--accent) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Owner Account (Optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Username</label>
                      <input className="input-field" placeholder="owner_user" value={oOwnerUsername} onChange={e => setOOwnerUsername(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Email</label>
                      <input type="email" className="input-field" placeholder="owner@org.com" value={oOwnerEmail} onChange={e => setOOwnerEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Password</label>
                      <input type="password" className="input-field" placeholder="Min 8 chars" value={oOwnerPassword} onChange={e => setOOwnerPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={oSaving} className="btn-accent">
                  {oSaving ? 'Saving…' : editingOrgId ? 'Update →' : 'Create Organisation →'}
                </button>
                {editingOrgId && <button type="button" onClick={resetOrgForm} className="btn-ghost">Cancel</button>}
              </div>
            </form>
          </div>

          {orgs.length > 0 && (
            <div className="glass-card p-6 fade-up-2">
              <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>
                All Organisations <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({orgs.length})</span>
              </h2>
              <div className="space-y-3">
                {orgs.map(org => (
                  <div key={org.id} className="p-4 rounded-sm"
                    style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--card-border)' }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{org.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}>
                            {org.org_type.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-sm ${org.is_active ? '' : 'opacity-60'}`}
                            style={{ color: org.is_active ? 'var(--success)' : 'var(--muted)', background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {org.member_count} members · {org.election_count} elections · Code: <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{org.join_code}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => startEditOrg(org)}
                          className="text-xs px-3 py-1.5 rounded-sm"
                          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteOrg(org)}
                          className="text-xs px-3 py-1.5 rounded-sm"
                          style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ELECTIONS TAB ══ */}
      {tab === 'elections' && (
        <div className="space-y-6">
          <div className="glass-card p-6 fade-up-1">
            <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
              {editingElectionId ? '✏️ Edit Election' : '➕ Create Election'}
            </h2>
            <form onSubmit={handleSaveElection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Title *</label>
                <input className="input-field" value={eTitle} onChange={e => setETitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
                <textarea className="input-field" rows={2} value={eDesc} onChange={e => setEDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Start *</label>
                  <input type="datetime-local" className="input-field" value={eStart} onChange={e => setEStart(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>End *</label>
                  <input type="datetime-local" className="input-field" value={eEnd} min={eStart} onChange={e => setEEnd(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} type="button" onClick={() => setEStatus(s.value)}
                      className="text-xs px-4 py-2 rounded-sm font-semibold transition-all"
                      style={{
                        color: eStatus === s.value ? 'var(--bg)' : s.color,
                        background: eStatus === s.value ? s.color : `color-mix(in srgb, ${s.color} 10%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${s.color} 40%, transparent)`,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={eSaving} className="btn-accent">
                  {eSaving ? 'Saving…' : editingElectionId ? 'Update →' : 'Create →'}
                </button>
                {editingElectionId && <button type="button" onClick={resetElectionForm} className="btn-ghost">Cancel</button>}
              </div>
            </form>
          </div>

          {elections.length > 0 && (
            <div className="glass-card p-6 fade-up-2">
              <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>
                All Elections <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({elections.length})</span>
              </h2>
              <div className="space-y-3">
                {elections.map(el => {
                  const statusOpt = STATUS_OPTIONS.find(s => s.value === el.status) || STATUS_OPTIONS[0]
                  return (
                    <div key={el.id} className="p-4 rounded-sm"
                      style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--card-border)' }}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{el.title}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-sm"
                              style={{ color: statusOpt.color, background: `color-mix(in srgb, ${statusOpt.color} 12%, transparent)` }}>
                              {statusOpt.label}
                            </span>
                            {el.org_name && <span className="text-xs" style={{ color: 'var(--muted)' }}>{el.org_name}</span>}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {new Date(el.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} → {new Date(el.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => startEditElection(el)}
                            className="text-xs px-3 py-1.5 rounded-sm"
                            style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDeleteElection(el.id, el.title)}
                            className="text-xs px-3 py-1.5 rounded-sm"
                            style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ CANDIDATES TAB ══ */}
      {tab === 'candidates' && (
        <div className="space-y-6">
          <div className="glass-card p-6 fade-up-1">
            <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
              {editingCandidateId ? '✏️ Edit Candidate' : '➕ Add Candidate'}
            </h2>
            {elections.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Create an election first.</p>
            ) : (
              <form onSubmit={handleSaveCandidate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Election *</label>
                  <select className="input-field" value={cElection} onChange={e => setCElection(Number(e.target.value))} required>
                    {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Full Name *</label>
                    <input className="input-field" value={cName} onChange={e => setCName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Position</label>
                    <input className="input-field" placeholder="e.g. President" value={cPosition} onChange={e => setCPosition(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Party</label>
                    <input className="input-field" value={cParty} onChange={e => setCParty(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Motto</label>
                    <input className="input-field" value={cMotto} onChange={e => setCMotto(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Photo URL</label>
                  <input type="url" className="input-field" placeholder="https://…" value={cPhotoUrl} onChange={e => setCPhotoUrl(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
                  <textarea className="input-field" rows={2} value={cDesc} onChange={e => setCDesc(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Manifesto</label>
                  <textarea className="input-field" rows={3} value={cManifesto} onChange={e => setCManifesto(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={cSaving} className="btn-accent">
                    {cSaving ? 'Saving…' : editingCandidateId ? 'Update →' : 'Add Candidate →'}
                  </button>
                  {editingCandidateId && <button type="button" onClick={resetCandidateForm} className="btn-ghost">Cancel</button>}
                </div>
              </form>
            )}
          </div>

          {elections.map(el => {
            const elCandidates = candidates.filter(c => c.election === el.id)
            return (
              <div key={el.id} className="glass-card p-6 fade-up-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="display-font text-base font-bold" style={{ color: 'var(--cream)' }}>
                    {el.title} <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({elCandidates.length})</span>
                  </h2>
                </div>
                {elCandidates.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>No candidates yet.</p>
                ) : (
                  <div className="space-y-2">
                    {elCandidates.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-sm"
                        style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {c.photo_url && (
                            <img src={c.photo_url} alt={c.name} className="w-8 h-8 rounded-sm object-cover shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-sm" style={{ color: 'var(--cream)' }}>{c.name}</span>
                            {c.position && <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{c.position}</span>}
                            {c.party && <span className="text-xs ml-2 font-semibold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>{c.party}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <button onClick={() => startEditCandidate(c)}
                            className="text-xs px-2.5 py-1 rounded-sm"
                            style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDeleteCandidate(c.id, c.name)}
                            className="text-xs px-2.5 py-1 rounded-sm"
                            style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══ RESULTS TAB ══ */}
      {tab === 'results' && (
        <div className="space-y-6">
          {elections.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <p className="text-5xl mb-4 opacity-20">📊</p>
              <p className="display-font text-xl" style={{ color: 'var(--muted)' }}>No elections yet</p>
            </div>
          ) : (
            <>
              <div className="glass-card p-5 fade-up-1 flex flex-wrap items-center gap-4">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Election</label>
                <select className="input-field max-w-xs text-sm py-2"
                  value={resultsElectionId ?? ''} onChange={e => setResultsElectionId(Number(e.target.value))}>
                  {elections.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              {resultsLoading ? (
                <div className="flex justify-center py-16"><div className="spinner" /></div>
              ) : results ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-up-2">
                    {[
                      { label: 'Total Votes', value: results.total_votes, color: 'var(--accent)' },
                      { label: 'Candidates', value: results.results.length, color: '#6366f1' },
                      { label: 'Leading', value: leader?.name ?? '—', color: 'var(--success)', small: true },
                    ].map(({ label, value, color, small }) => (
                      <div key={label} className="glass-card p-5 text-center">
                        <p className={`font-black display-font mb-1 ${small ? 'text-xl' : 'text-4xl'}`} style={{ color }}>{value}</p>
                        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {results.total_votes > 0 && (
                    <div className="glass-card p-6 fade-up-3">
                      <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted)' }}>Vote Distribution</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={results.results} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                          <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--accent) 5%, transparent)' }} />
                          <Bar dataKey="vote_count" radius={[4, 4, 0, 0]}>
                            {results.results.map((_, i) => <Cell key={i} fill={COLORS_STATIC[i % COLORS_STATIC.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="glass-card p-6 fade-up-4">
                    <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted)' }}>Detailed Breakdown</p>
                    <div className="space-y-5">
                      {results.results.map((r, i) => (
                        <div key={r.id}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="w-6 text-center text-xs font-bold display-font"
                                style={{ color: i === 0 ? 'var(--accent)' : 'var(--muted)' }}>
                                {i === 0 ? '★' : `#${i + 1}`}
                              </span>
                              <div>
                                <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{r.name}</span>
                                {r.party && <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{r.party}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold" style={{ color: COLORS_STATIC[i % COLORS_STATIC.length] }}>
                                {r.vote_count} votes
                              </span>
                              {r.percentage !== undefined && (
                                <span className="text-xs ml-2 font-bold px-2 py-0.5 rounded-sm"
                                  style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                                  {r.percentage}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden ml-9"
                            style={{ background: 'color-mix(in srgb, var(--muted) 15%, transparent)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${r.percentage ?? 0}%`, background: COLORS_STATIC[i % COLORS_STATIC.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}