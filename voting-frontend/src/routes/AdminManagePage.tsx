import React, { useEffect, useState } from 'react'
import {
  getAdminElections, createElection, updateElection, deleteElection, createCandidate,
  getTeamMembers, addTeamMember, deleteTeamMember,
  type TeamMember,
} from '../api/admin'
import type { Election, Candidate } from '../api/elections'
import axios from 'axios'

function toISO(val: string) { return val ? new Date(val).toISOString() : '' }
function nowLocal() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
function futureLocal(days: number) {
  const d = new Date(); d.setDate(d.getDate() + days)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const STATUS_OPTIONS = [
  { value: 'DRAFT',  label: '○ Draft',   color: 'var(--muted)'   },
  { value: 'ACTIVE', label: '● Active',  color: 'var(--success)' },
  { value: 'PAUSED', label: '⏸ Paused',  color: '#f59e0b'        },
  { value: 'ENDED',  label: '✕ Ended',   color: 'var(--danger)'  },
]

export default function AdminManagePage() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // election form
  const [eTitle, setETitle] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eStart, setEStart] = useState(nowLocal())
  const [eEnd, setEEnd] = useState(futureLocal(7))
  const [eStatus, setEStatus] = useState('DRAFT')
  const [eSaving, setESaving] = useState(false)

  // candidate form
  const [cElection, setCElection] = useState<number | ''>('')
  const [cName, setCName] = useState('')
  const [cParty, setCParty] = useState('')
  const [cPosition, setCPosition] = useState('')
  const [cMotto, setCMotto] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cPhotoUrl, setCPhotoUrl] = useState('')
  const [cManifesto, setCManifesto] = useState('')
  const [cSaving, setCSaving] = useState(false)

  // team member management
  const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null)
  const [teamMap, setTeamMap] = useState<Record<number, TeamMember[]>>({})
  const [tmName, setTmName] = useState('')
  const [tmTitle, setTmTitle] = useState('')
  const [tmPhoto, setTmPhoto] = useState('')
  const [tmSaving, setTmSaving] = useState(false)

  const load = () => {
    getAdminElections().then(data => {
      setElections(data)
      if (data.length > 0 && !cElection) setCElection(data[0].id)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const flash = (m: string, isErr = false) => {
    if (isErr) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 6000)
  }

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (new Date(eStart) >= new Date(eEnd)) { flash('End time must be after start time.', true); return }
    setESaving(true)
    try {
      await createElection({ title: eTitle, description: eDesc, start_time: toISO(eStart), end_time: toISO(eEnd), status: eStatus })
      flash('Election created!')
      setETitle(''); setEDesc(''); setEStart(nowLocal()); setEEnd(futureLocal(7)); setEStatus('DRAFT')
      load()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data)
        flash(Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '), true)
      else flash('Error creating election.', true)
    } finally { setESaving(false) }
  }

  const handleStatusChange = async (el: Election, newStatus: string) => {
    try { await updateElection(el.id, { status: newStatus }); load(); flash(`"${el.title}" set to ${newStatus}.`) }
    catch { flash('Failed to update status.', true) }
  }

  const handleDeleteElection = async (el: Election) => {
    if (!confirm(`Delete "${el.title}"? All votes and candidates will be permanently deleted.`)) return
    try { await deleteElection(el.id); flash(`"${el.title}" deleted.`); load() }
    catch { flash('Failed to delete election.', true) }
  }

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cElection) return
    setCSaving(true)
    try {
      await createCandidate({ name: cName, party: cParty, description: cDesc, position: cPosition, motto: cMotto, photo_url: cPhotoUrl, manifesto: cManifesto, election: Number(cElection) })
      flash('Candidate added!')
      setCName(''); setCParty(''); setCDesc(''); setCPosition(''); setCMotto(''); setCPhotoUrl(''); setCManifesto('')
      load()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data)
        flash(Object.entries(err.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '), true)
      else flash('Error adding candidate.', true)
    } finally { setCSaving(false) }
  }

  const handleExpandTeam = async (candidateId: number) => {
    if (expandedCandidateId === candidateId) { setExpandedCandidateId(null); return }
    setExpandedCandidateId(candidateId)
    if (!teamMap[candidateId]) {
      const members = await getTeamMembers(candidateId).catch(() => [] as TeamMember[])
      setTeamMap(prev => ({ ...prev, [candidateId]: members }))
    }
  }

  const handleAddTeamMember = async (candidateId: number) => {
    if (!tmName.trim()) return
    setTmSaving(true)
    try {
      const member = await addTeamMember(candidateId, { name: tmName, title: tmTitle, photo_url: tmPhoto, order: (teamMap[candidateId]?.length ?? 0) })
      setTeamMap(prev => ({ ...prev, [candidateId]: [...(prev[candidateId] ?? []), member] }))
      setTmName(''); setTmTitle(''); setTmPhoto('')
      flash('Team member added!')
    } catch { flash('Failed to add team member.', true) }
    finally { setTmSaving(false) }
  }

  const handleDeleteTeamMember = async (candidateId: number, memberId: number) => {
    if (!confirm('Remove this team member?')) return
    await deleteTeamMember(memberId).catch(() => null)
    setTeamMap(prev => ({ ...prev, [candidateId]: prev[candidateId].filter(m => m.id !== memberId) }))
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="spinner" /><p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
    </div>
  )

  // Build all candidates across all elections
  const allCandidates: (Candidate & { electionTitle: string })[] = elections.flatMap(el =>
    (el.candidates ?? []).map(c => ({ ...c, electionTitle: el.title }))
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="fade-up">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Manage Elections</h1>
      </div>

      {msg && <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
        style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', color: 'var(--success)' }}>✓ {msg}</div>}
      {error && <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm"
        style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>⚠ {error}</div>}

      {/* Create Election */}
      <div className="glass-card p-6 fade-up-1">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Create Election</h2>
        <form onSubmit={handleCreateElection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Title *</label>
            <input className="input-field" placeholder="e.g. Student Council 2025" value={eTitle} onChange={e => setETitle(e.target.value)} required />
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
          {eStart && eEnd && new Date(eEnd) > new Date(eStart) && (
            <div className="px-3 py-2 rounded-sm text-xs"
              style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}>
              ⏱ Duration: {Math.round((new Date(eEnd).getTime() - new Date(eStart).getTime()) / 3600000)} hours
            </div>
          )}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Quick presets</p>
            <div className="flex flex-wrap gap-2">
              {[{ label: '1 day', days: 1 }, { label: '3 days', days: 3 }, { label: '1 week', days: 7 }, { label: '2 weeks', days: 14 }].map(({ label, days }) => (
                <button key={label} type="button" onClick={() => { setEStart(nowLocal()); setEEnd(futureLocal(days)) }}
                  className="text-xs px-3 py-1.5 rounded-sm transition-all"
                  style={{ border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--accent)', background: 'transparent' }}>
                  Now → +{label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Initial Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setEStatus(s.value)}
                  className="text-xs px-4 py-2 rounded-sm font-semibold transition-all"
                  style={{ color: eStatus === s.value ? 'var(--bg)' : s.color, background: eStatus === s.value ? s.color : `color-mix(in srgb, ${s.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${s.color} 40%, transparent)` }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={eSaving} className="btn-accent">
            {eSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating…</> : 'Create Election →'}
          </button>
        </form>
      </div>

      {/* Existing Elections */}
      {elections.length > 0 && (
        <div className="glass-card p-6 fade-up-2">
          <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
            Elections <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({elections.length})</span>
          </h2>
          <div className="space-y-3">
            {elections.map(el => (
              <div key={el.id} className="p-4 rounded-sm"
                style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                <div className="flex items-start gap-4 justify-between flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--cream)' }}>{el.title}</p>
                    <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                      {new Date(el.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} → {new Date(el.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map(s => (
                        <button key={s.value} onClick={() => handleStatusChange(el, s.value)} disabled={el.status === s.value}
                          className="text-xs px-3 py-1 rounded-sm font-semibold transition-all"
                          style={{ color: el.status === s.value ? 'var(--bg)' : s.color, background: el.status === s.value ? s.color : `color-mix(in srgb, ${s.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${s.color} ${el.status === s.value ? '100' : '30'}%, transparent)`, opacity: el.status === s.value ? 1 : 0.7 }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteElection(el)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-sm transition-all"
                    style={{ color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Candidate */}
      <div className="glass-card p-6 fade-up-3">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Add Candidate</h2>
        {elections.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Create an election first.</p>
        ) : (
          <form onSubmit={handleCreateCandidate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Election *</label>
              <select className="input-field" value={cElection} onChange={e => setCElection(Number(e.target.value))} required>
                {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Name *</label>
                <input className="input-field" value={cName} onChange={e => setCName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Position</label>
                <input className="input-field" placeholder="e.g. President" value={cPosition} onChange={e => setCPosition(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description / Bio</label>
              <textarea className="input-field" rows={2} value={cDesc} onChange={e => setCDesc(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Manifesto</label>
              <textarea className="input-field" rows={3} value={cManifesto} onChange={e => setCManifesto(e.target.value)} />
            </div>
            <button type="submit" disabled={cSaving} className="btn-accent">
              {cSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Adding…</> : 'Add Candidate →'}
            </button>
          </form>
        )}
      </div>

      {/* Team Member Management */}
      {allCandidates.length > 0 && (
        <div className="glass-card p-6 fade-up-4">
          <h2 className="display-font text-lg font-bold mb-1" style={{ color: 'var(--cream)' }}>Running Teams</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
            Add a vice president, secretary, or other team members under each candidate.
          </p>
          <div className="space-y-3">
            {allCandidates.map(c => {
              const isOpen = expandedCandidateId === c.id
              const members = teamMap[c.id] ?? []
              return (
                <div key={c.id} className="rounded-sm overflow-hidden"
                  style={{ border: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                  {/* Header row */}
                  <button
                    onClick={() => handleExpandTeam(c.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
                    style={{ background: isOpen ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'color-mix(in srgb, var(--bg) 60%, transparent)' }}>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{c.name}</span>
                      {c.position && (
                        <span className="ml-2 text-xs tracking-wide" style={{ color: 'var(--accent)', opacity: 0.8 }}>— {c.position}</span>
                      )}
                      <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>{c.electionTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOpen && members.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                          {members.length} member{members.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 space-y-4"
                      style={{ borderTop: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)', background: 'color-mix(in srgb, var(--accent) 2%, transparent)' }}>

                      {/* Existing members */}
                      {members.length > 0 ? (
                        <div className="space-y-2">
                          {members.map(m => (
                            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm"
                              style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                              <div className="flex items-center gap-2.5 min-w-0">
                                {m.photo_url && (
                                  <img src={m.photo_url} alt={m.name} className="w-7 h-7 rounded-sm object-cover shrink-0"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--cream)' }}>{m.name}</p>
                                  {m.title && <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{m.title}</p>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteTeamMember(c.id, m.id)}
                                className="shrink-0 text-xs px-2 py-1 rounded-sm transition-all"
                                style={{ color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>No team members yet.</p>
                      )}

                      {/* Add team member form */}
                      <div className="pt-2" style={{ borderTop: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>Add Team Member</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Name *</label>
                            <input className="input-field" placeholder="e.g. Jane Doe" value={tmName} onChange={e => setTmName(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Title / Role</label>
                            <input className="input-field" placeholder="e.g. Vice President" value={tmTitle} onChange={e => setTmTitle(e.target.value)} />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Photo URL</label>
                          <input type="url" className="input-field" placeholder="https://…" value={tmPhoto} onChange={e => setTmPhoto(e.target.value)} />
                        </div>
                        <button
                          onClick={() => handleAddTeamMember(c.id)}
                          disabled={tmSaving || !tmName.trim()}
                          className="btn-accent text-xs px-4 py-2">
                          {tmSaving ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Adding…</> : '+ Add Member'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}