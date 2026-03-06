import React, { useEffect, useState } from 'react'
import { getAdminElections, createElection, updateElection, createCandidate, Election } from '../api/elections'
import axios from 'axios'

// Helper: convert datetime-local string to ISO for Django
function toISO(val: string) {
  if (!val) return ''
  return new Date(val).toISOString()
}

// Helper: get current datetime-local string for default values
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

export default function AdminManagePage() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [eTitle, setETitle] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eStart, setEStart] = useState(nowLocal())
  const [eEnd, setEEnd] = useState(futureLocal(7))
  const [eActive, setEActive] = useState(true)
  const [eSaving, setESaving] = useState(false)

  const [cElection, setCElection] = useState<number | ''>('')
  const [cName, setCName] = useState('')
  const [cParty, setCParty] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cSaving, setCSaving] = useState(false)

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
    if (!eStart || !eEnd) { flash('Please set both start and end times.', true); return }
    if (new Date(eStart) >= new Date(eEnd)) { flash('End time must be after start time.', true); return }

    setESaving(true)
    try {
      await createElection({
        title: eTitle,
        description: eDesc,
        start_time: toISO(eStart),
        end_time: toISO(eEnd),
        is_active: eActive,
      })
      flash('Election created successfully!')
      setETitle('')
      setEDesc('')
      setEStart(nowLocal())
      setEEnd(futureLocal(7))
      setEActive(true)
      load()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data
        const messages = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ')
        flash(messages, true)
      } else {
        flash('Error creating election. Please try again.', true)
      }
    } finally { setESaving(false) }
  }

  const handleToggle = async (el: Election) => {
    try { await updateElection(el.id, { is_active: !el.is_active }); load() }
    catch { flash('Failed to update election.', true) }
  }

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cElection) return
    setCSaving(true)
    try {
      await createCandidate({ name: cName, party: cParty, description: cDesc, election: Number(cElection) })
      flash('Candidate added successfully!')
      setCName(''); setCParty(''); setCDesc('')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data
        const messages = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ')
        flash(messages, true)
      } else {
        flash('Error adding candidate.', true)
      }
    } finally { setCSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="spinner" />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="fade-up">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Manage Elections</h1>
      </div>

      {msg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
          style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', color: 'var(--success)' }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm"
          style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>
          <span className="shrink-0 mt-0.5">⚠</span> <span>{error}</span>
        </div>
      )}

      {/* ── Create Election ── */}
      <div className="glass-card p-6 fade-up-1">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Create Election</h2>
        <form onSubmit={handleCreateElection} className="space-y-4">

          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Title *</label>
            <input className="input-field" placeholder="e.g. Student Council 2025"
              value={eTitle} onChange={e => setETitle(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
            <textarea className="input-field" placeholder="Optional description…"
              value={eDesc} onChange={e => setEDesc(e.target.value)} rows={2} />
          </div>

          {/* Date/time pickers — split into date + time for better UX */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                Start *
              </label>
              <input type="datetime-local" className="input-field"
                value={eStart} onChange={e => setEStart(e.target.value)} required />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {eStart ? new Date(eStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                End *
              </label>
              <input type="datetime-local" className="input-field"
                value={eEnd} onChange={e => setEEnd(e.target.value)}
                min={eStart} required />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {eEnd ? new Date(eEnd).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </p>
            </div>
          </div>

          {/* Duration preview */}
          {eStart && eEnd && new Date(eEnd) > new Date(eStart) && (
            <div className="px-3 py-2 rounded-sm text-xs"
              style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}>
              ⏱ Duration: {Math.round((new Date(eEnd).getTime() - new Date(eStart).getTime()) / 3600000)} hours
            </div>
          )}

          {/* Quick presets */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Quick presets</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '1 day', days: 1 },
                { label: '3 days', days: 3 },
                { label: '1 week', days: 7 },
                { label: '2 weeks', days: 14 },
              ].map(({ label, days }) => (
                <button key={label} type="button"
                  onClick={() => { setEStart(nowLocal()); setEEnd(futureLocal(days)) }}
                  className="text-xs px-3 py-1.5 rounded-sm transition-all"
                  style={{ border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--accent)', background: 'transparent' }}>
                  Now → +{label}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setEActive(!eActive)}
              className="w-10 h-5 rounded-full relative transition-all duration-200 shrink-0"
              style={{ background: eActive ? 'var(--accent)' : 'color-mix(in srgb, var(--muted) 30%, transparent)' }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                style={{ background: 'white', left: eActive ? '1.375rem' : '0.125rem' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Mark as active immediately
            </span>
          </label>

          <button type="submit" disabled={eSaving} className="btn-accent">
            {eSaving
              ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating…</>
              : 'Create Election →'}
          </button>
        </form>
      </div>

      {/* ── Existing Elections ── */}
      {elections.length > 0 && (
        <div className="glass-card p-6 fade-up-2">
          <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
            Elections <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({elections.length})</span>
          </h2>
          <div className="space-y-3">
            {elections.map(el => (
              <div key={el.id} className="flex items-center justify-between p-4 rounded-sm"
                style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--cream)' }}>{el.title}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(el.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    {' → '}
                    {new Date(el.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <button onClick={() => handleToggle(el)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-sm tracking-wider transition-all shrink-0 ml-3"
                  style={{
                    background: el.is_active ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--muted) 10%, transparent)',
                    color: el.is_active ? 'var(--success)' : 'var(--muted)',
                    border: el.is_active ? '1px solid color-mix(in srgb, var(--success) 35%, transparent)' : '1px solid color-mix(in srgb, var(--muted) 25%, transparent)',
                  }}>
                  {el.is_active ? '● ACTIVE' : '○ INACTIVE'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Candidate ── */}
      <div className="glass-card p-6 fade-up-3">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Add Candidate</h2>
        {elections.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Create an election first before adding candidates.</p>
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
                <input className="input-field" placeholder="Full name"
                  value={cName} onChange={e => setCName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Party</label>
                <input className="input-field" placeholder="Party or affiliation"
                  value={cParty} onChange={e => setCParty(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
              <textarea className="input-field" placeholder="Brief bio or platform…"
                value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2} />
            </div>
            <button type="submit" disabled={cSaving} className="btn-accent">
              {cSaving
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Adding…</>
                : 'Add Candidate →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}