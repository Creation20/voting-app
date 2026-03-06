import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  superuserGetElections, superuserCreateElection, superuserUpdateElection, superuserDeleteElection,
  superuserGetResults, superuserGetCandidates, superuserCreateCandidate,
  superuserUpdateCandidate, superuserDeleteCandidate,
  Election, Candidate, ResultsResponse,
} from '../api/elections'
import axios from 'axios'

const COLORS_STATIC = ['#a855f7', '#6366f1', '#34d399', '#f59e0b', '#ec4899', '#60a5fa']

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

type Tab = 'elections' | 'candidates' | 'results'

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; vote_count: number; percentage: number } }> }) => {
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

export default function SuperuserPage() {
  const [tab, setTab] = useState<Tab>('elections')
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Election form
  const [editingElectionId, setEditingElectionId] = useState<number | null>(null)
  const [eTitle, setETitle] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eStart, setEStart] = useState(nowLocal())
  const [eEnd, setEEnd] = useState(futureLocal(7))
  const [eActive, setEActive] = useState(true)
  const [eSaving, setESaving] = useState(false)

  // Candidate form
  const [editingCandidateId, setEditingCandidateId] = useState<number | null>(null)
  const [cElection, setCElection] = useState<number | ''>('')
  const [cName, setCName] = useState<string>('')
  const [cParty, setCParty] = useState<string>('')
  const [cMotto, setCMotto] = useState<string>('')
  const [cDesc, setCDesc] = useState<string>('')
  const [cSaving, setCSaving] = useState(false)

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
      const [e, c] = await Promise.all([superuserGetElections(), superuserGetCandidates()])
      setElections(e)
      setCandidates(c)
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

  // ── Election form handlers ──
  const resetElectionForm = () => {
    setEditingElectionId(null)
    setETitle(''); setEDesc('')
    setEStart(nowLocal()); setEEnd(futureLocal(7))
    setEActive(true)
  }

  const startEditElection = (el: Election) => {
    setEditingElectionId(el.id)
    setETitle(el.title); setEDesc(el.description)
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      return d.toISOString().slice(0, 16)
    }
    setEStart(toLocal(el.start_time)); setEEnd(toLocal(el.end_time))
    setEActive(el.is_active)
    setTab('elections')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveElection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (new Date(eStart) >= new Date(eEnd)) { flash('End time must be after start time.', true); return }
    setESaving(true)
    const payload = { title: eTitle, description: eDesc, start_time: toISO(eStart), end_time: toISO(eEnd), is_active: eActive }
    try {
      if (editingElectionId) {
        await superuserUpdateElection(editingElectionId, payload)
        flash('Election updated.')
      } else {
        await superuserCreateElection(payload)
        flash('Election created!')
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

  const handleToggleElection = async (el: Election) => {
    try { await superuserUpdateElection(el.id, { is_active: !el.is_active }); load() }
    catch { flash('Failed to update.', true) }
  }

  // ── Candidate form handlers ──
  const resetCandidateForm = () => {
    setEditingCandidateId(null)
    setCName(''); setCParty(''); setCMotto(''); setCDesc('')
    if (elections.length > 0) setCElection(elections[0].id)
  }

  const startEditCandidate = (c: Candidate) => {
    setEditingCandidateId(c.id)
    setCName(c.name); setCParty(c.party); setCMotto(c.motto ?? ''); setCDesc(c.description)
    setCElection(c.election)
    setTab('candidates')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cElection) return
    setCSaving(true)
    try {
      if (editingCandidateId) {
        await superuserUpdateCandidate(editingCandidateId, { name: cName, party: cParty, motto: cMotto, description: cDesc, election: Number(cElection) })
        flash('Candidate updated.')
      } else {
        await superuserCreateCandidate({ name: cName, party: cParty, motto: cMotto, description: cDesc, election: Number(cElection) })
        flash('Candidate added!')
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

  const electionMap = Object.fromEntries(elections.map(e => [e.id, e.title]))
  const leader = results?.results[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Superuser Panel</p>
          <span className="badge-accent">⚡ SUPERUSER</span>
        </div>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Control Centre</h1>
      </div>

      {/* Toasts */}
      {msg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
          style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', color: 'var(--success)' }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm"
          style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>
          <span className="shrink-0">⚠</span> <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {(['elections', 'candidates', 'results'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm font-semibold rounded-sm capitalize transition-all"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'var(--bg)' : 'var(--muted)',
            }}>
            {t === 'elections' ? `🗳 Elections (${elections.length})` : t === 'candidates' ? `👤 Candidates (${candidates.length})` : '📊 Results'}
          </button>
        ))}
      </div>

      {/* ══ ELECTIONS TAB ══ */}
      {tab === 'elections' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="glass-card p-6 fade-up-1">
            <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
              {editingElectionId ? '✏️ Edit Election' : '➕ Create Election'}
            </h2>
            <form onSubmit={handleSaveElection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Title *</label>
                <input className="input-field" placeholder="e.g. Student Council 2025"
                  value={eTitle} onChange={e => setETitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
                <textarea className="input-field" placeholder="Optional…" rows={2}
                  value={eDesc} onChange={e => setEDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Start *</label>
                  <input type="datetime-local" className="input-field" value={eStart} onChange={e => setEStart(e.target.value)} required />
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{eStart ? new Date(eStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>End *</label>
                  <input type="datetime-local" className="input-field" value={eEnd} min={eStart} onChange={e => setEEnd(e.target.value)} required />
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{eEnd ? new Date(eEnd).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
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
                    <button key={label} type="button"
                      onClick={() => { setEStart(nowLocal()); setEEnd(futureLocal(days)) }}
                      className="text-xs px-3 py-1.5 rounded-sm transition-all"
                      style={{ border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--accent)', background: 'transparent' }}>
                      Now → +{label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={() => setEActive(!eActive)}
                  className="w-10 h-5 rounded-full relative transition-all duration-200 shrink-0"
                  style={{ background: eActive ? 'var(--accent)' : 'color-mix(in srgb, var(--muted) 30%, transparent)' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                    style={{ background: 'white', left: eActive ? '1.375rem' : '0.125rem' }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Active immediately</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={eSaving} className="btn-accent">
                  {eSaving ? 'Saving…' : editingElectionId ? 'Update Election →' : 'Create Election →'}
                </button>
                {editingElectionId && <button type="button" onClick={resetElectionForm} className="btn-ghost">Cancel</button>}
              </div>
            </form>
          </div>

          {/* Election list */}
          {elections.length > 0 && (
            <div className="glass-card p-6 fade-up-2">
              <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>
                All Elections <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({elections.length})</span>
              </h2>
              <div className="space-y-3">
                {elections.map(el => (
                  <div key={el.id} className="p-4 rounded-sm"
                    style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--card-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{el.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-sm font-semibold"
                            style={{
                              background: el.is_active ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--muted) 10%, transparent)',
                              color: el.is_active ? 'var(--success)' : 'var(--muted)',
                              border: el.is_active ? '1px solid color-mix(in srgb, var(--success) 30%, transparent)' : '1px solid color-mix(in srgb, var(--muted) 20%, transparent)',
                            }}>
                            {el.is_active ? '● ACTIVE' : '○ INACTIVE'}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {new Date(el.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} → {new Date(el.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        {el.description && <p className="text-xs mt-1" style={{ color: 'var(--muted)', opacity: 0.7 }}>{el.description}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                        <button onClick={() => handleToggleElection(el)}
                          className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
                          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
                          {el.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => startEditElection(el)}
                          className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
                          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteElection(el.id, el.title)}
                          className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
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
                    <input className="input-field" placeholder="e.g. Alice Johnson"
                      value={cName} onChange={e => setCName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Party / Section</label>
                    <input className="input-field" placeholder="e.g. Progress Party"
                      value={cParty} onChange={e => setCParty(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Motto</label>
                  <input className="input-field" placeholder='"Together we rise"'
                    value={cMotto} onChange={e => setCMotto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
                  <textarea className="input-field" placeholder="Brief bio or platform…"
                    value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2} />
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

          {/* Grouped by election */}
          {elections.map(el => {
            const elCandidates = candidates.filter(c => c.election === el.id)
            return (
              <div key={el.id} className="glass-card p-6 fade-up-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="display-font text-base font-bold" style={{ color: 'var(--cream)' }}>
                    {el.title}
                    <span className="text-sm font-normal ml-2" style={{ color: 'var(--muted)' }}>({elCandidates.length} candidates)</span>
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-sm"
                    style={{ background: el.is_active ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--muted) 10%, transparent)', color: el.is_active ? 'var(--success)' : 'var(--muted)' }}>
                    {el.is_active ? '● ACTIVE' : '○ INACTIVE'}
                  </span>
                </div>
                {elCandidates.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>No candidates yet.</p>
                ) : (
                  <div className="space-y-2">
                    {elCandidates.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-sm"
                        style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm" style={{ color: 'var(--cream)' }}>{c.name}</span>
                          {c.party && <span className="text-xs ml-2 font-semibold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>{c.party}</span>}
                          {c.motto && <p className="text-xs italic mt-0.5" style={{ color: 'var(--accent)', opacity: 0.7 }}>"{c.motto}"</p>}
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <button onClick={() => startEditCandidate(c)}
                            className="text-xs px-2.5 py-1 rounded-sm transition-all"
                            style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDeleteCandidate(c.id, c.name)}
                            className="text-xs px-2.5 py-1 rounded-sm transition-all"
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
                  {/* Stat cards */}
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

                  {/* Bar chart */}
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

                  {/* Detailed breakdown WITH percentages */}
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