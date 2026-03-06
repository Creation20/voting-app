import React, { useEffect, useState } from 'react'
import { getAdminElections, createElection, updateElection, createCandidate, Election } from '../api/elections'
import axios from 'axios'

export default function AdminManagePage() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [eTitle, setETitle] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eStart, setEStart] = useState('')
  const [eEnd, setEEnd] = useState('')
  const [eActive, setEActive] = useState(false)
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
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault(); setESaving(true)
    try {
      await createElection({ title: eTitle, description: eDesc, start_time: eStart, end_time: eEnd, is_active: eActive })
      flash('Election created successfully.')
      setETitle(''); setEDesc(''); setEStart(''); setEEnd(''); setEActive(false)
      load()
    } catch (err) {
      flash(axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : 'Error creating election.', true)
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
      flash('Candidate added.')
      setCName(''); setCParty(''); setCDesc('')
    } catch (err) {
      flash(axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : 'Error creating candidate.', true)
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
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Manage Elections</h1>
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

      <div className="glass-card p-6 fade-up-1">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Create Election</h2>
        <form onSubmit={handleCreateElection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Title</label>
            <input className="input-field" placeholder="e.g. Student Council 2025" value={eTitle} onChange={e => setETitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
            <textarea className="input-field" placeholder="Optional description…" value={eDesc} onChange={e => setEDesc(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Start Time</label>
              <input type="datetime-local" className="input-field" value={eStart} onChange={e => setEStart(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>End Time</label>
              <input type="datetime-local" className="input-field" value={eEnd} onChange={e => setEEnd(e.target.value)} required />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setEActive(!eActive)}
              className="w-10 h-5 rounded-full relative transition-all duration-200 shrink-0"
              style={{ background: eActive ? 'var(--gold)' : 'rgba(138,155,181,0.2)' }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                style={{ background: 'white', left: eActive ? '1.375rem' : '0.125rem' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Mark as active immediately</span>
          </label>
          <button type="submit" disabled={eSaving} className="btn-gold">
            {eSaving ? 'Creating…' : 'Create Election →'}
          </button>
        </form>
      </div>

      {elections.length > 0 && (
        <div className="glass-card p-6 fade-up-2">
          <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>
            Elections <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({elections.length})</span>
          </h2>
          <div className="space-y-3">
            {elections.map(el => (
              <div key={el.id} className="flex items-center justify-between p-4 rounded-sm"
                style={{ background: 'rgba(10,15,30,0.4)', border: '1px solid rgba(212,168,67,0.08)' }}>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--cream)' }}>{el.title}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(el.start_time).toLocaleDateString()} – {new Date(el.end_time).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => handleToggle(el)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-sm tracking-wider transition-all"
                  style={{
                    background: el.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(138,155,181,0.1)',
                    color: el.is_active ? '#34d399' : 'var(--muted)',
                    border: el.is_active ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(138,155,181,0.2)',
                  }}>
                  {el.is_active ? '● ACTIVE' : '○ INACTIVE'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6 fade-up-3">
        <h2 className="display-font text-lg font-bold mb-5" style={{ color: 'var(--cream)' }}>Add Candidate</h2>
        {elections.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Create an election first before adding candidates.</p>
        ) : (
          <form onSubmit={handleCreateCandidate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Election</label>
              <select className="input-field" value={cElection} onChange={e => setCElection(Number(e.target.value))} required>
                {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Name</label>
                <input className="input-field" placeholder="Full name" value={cName} onChange={e => setCName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Party</label>
                <input className="input-field" placeholder="Party or affiliation" value={cParty} onChange={e => setCParty(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
              <textarea className="input-field" placeholder="Brief bio or platform…" value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2} />
            </div>
            <button type="submit" disabled={cSaving} className="btn-gold">
              {cSaving ? 'Adding…' : 'Add Candidate →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}