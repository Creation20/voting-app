import React, { useEffect, useState } from 'react'
import {
  getAdminElections,
  superuserGetCandidates,
  superuserCreateCandidate,
  superuserUpdateCandidate,
  superuserDeleteCandidate,
  Election,
  Candidate,
} from '../api/elections'
import axios from 'axios'

export default function SuperuserPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [cElection, setCElection] = useState<number | ''>('')
  const [cName, setCName] = useState('')
  const [cParty, setCParty] = useState('')
  const [cMotto, setCMotto] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const flash = (m: string, isErr = false) => {
    if (isErr) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const load = async () => {
    try {
      const [e, c] = await Promise.all([getAdminElections(), superuserGetCandidates()])
      setElections(e)
      setCandidates(c)
      if (e.length > 0 && !cElection) setCElection(e[0].id)
    } catch {
      flash('Failed to load data.', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setCName(''); setCParty(''); setCMotto(''); setCDesc('')
    setEditingId(null)
    if (elections.length > 0) setCElection(elections[0].id)
  }

  const startEdit = (c: Candidate) => {
    setEditingId(c.id)
    setCName(c.name)
    setCParty(c.party)
    setCMotto(c.motto)
    setCDesc(c.description)
    setCElection(c.election)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cElection) return
    setSaving(true)
    try {
      if (editingId) {
        await superuserUpdateCandidate(editingId, { name: cName, party: cParty, motto: cMotto, description: cDesc, election: Number(cElection) })
        flash('Candidate updated successfully.')
      } else {
        await superuserCreateCandidate({ name: cName, party: cParty, motto: cMotto, description: cDesc, election: Number(cElection) })
        flash('Candidate added successfully.')
      }
      resetForm()
      load()
    } catch (err) {
      flash(axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : 'Failed to save candidate.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from the election? This cannot be undone.`)) return
    try {
      await superuserDeleteCandidate(id)
      flash('Candidate removed.')
      load()
    } catch {
      flash('Failed to delete candidate.', true)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="spinner" />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  const electionMap = Object.fromEntries(elections.map(e => [e.id, e.title]))

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Superuser Panel</p>
          <span className="badge-gold">⚡ SUPERUSER</span>
        </div>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Candidate Manager</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Add, edit, or remove candidates. Set their name, party, and motto.
        </p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
          ⚠ {error}
        </div>
      )}

      {/* Add / Edit Form */}
      <div className="glass-card p-6 fade-up-1">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
          {editingId ? '✏️ Edit Candidate' : '➕ Add Candidate'}
        </h2>

        {elections.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No elections found. Ask an admin to create one first.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Election */}
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                Election
              </label>
              <select className="input-field" value={cElection} onChange={e => setCElection(Number(e.target.value))} required>
                {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
              </select>
            </div>

            {/* Name + Party side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                  Full Name
                </label>
                <input className="input-field" placeholder="e.g. Alice Johnson" value={cName}
                  onChange={e => setCName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                  Party / Section
                </label>
                <input className="input-field" placeholder="e.g. Progress Party" value={cParty}
                  onChange={e => setCParty(e.target.value)} />
              </div>
            </div>

            {/* Motto */}
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                Motto
              </label>
              <input className="input-field" placeholder='e.g. "Together we rise"' value={cMotto}
                onChange={e => setCMotto(e.target.value)} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                Description <span style={{ color: 'var(--muted)', opacity: 0.5 }}>(optional)</span>
              </label>
              <textarea className="input-field" placeholder="Brief bio or platform statement…" value={cDesc}
                onChange={e => setCDesc(e.target.value)} rows={2} />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-gold">
                {saving ? 'Saving…' : editingId ? 'Update Candidate →' : 'Add Candidate →'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-ghost">Cancel</button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Candidate list */}
      <div className="glass-card p-6 fade-up-2">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
          All Candidates{' '}
          <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({candidates.length})</span>
        </h2>

        {candidates.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No candidates yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {candidates.map(c => (
              <div key={c.id} className="p-4 rounded-sm"
                style={{ background: 'rgba(10,15,30,0.4)', border: '1px solid rgba(212,168,67,0.08)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold" style={{ color: 'var(--cream)' }}>{c.name}</span>
                      {c.party && (
                        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--gold)' }}>
                          {c.party}
                        </span>
                      )}
                    </div>
                    {c.motto && (
                      <p className="text-sm italic mb-1" style={{ color: 'var(--gold)', opacity: 0.75 }}>"{c.motto}"</p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {electionMap[c.election] ?? `Election #${c.election}`}
                      {c.description && ` · ${c.description.slice(0, 80)}${c.description.length > 80 ? '…' : ''}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(c)}
                      className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
                      style={{ background: 'rgba(212,168,67,0.1)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,0.25)' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c.id, c.name)}
                      className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
                      style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}