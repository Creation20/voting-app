import React, { useEffect, useState } from 'react'
import { getAllElections, getCandidates, castVote, Election, Candidate } from '../api/elections'
import CandidateCard from '../components/CandidateCard'
import axios from 'axios'

export default function CandidateListPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [selected, setSelected] = useState<Election | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [votedCandidateId, setVotedCandidateId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    getAllElections()
      .then(data => {
        setElections(data)
        // Auto-select the first active election, or just the first one
        const active = data.find(e => e.is_active) ?? data[0] ?? null
        setSelected(active)
      })
      .catch(() => setError('Failed to load elections. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setCandidatesLoading(true)
    setVotedCandidateId(null)
    setCandidates([])
    setSuccessMsg('')
    setError('')
    getCandidates(selected.id)
      .then(({ candidates: c, voted_candidate_id }) => {
        setCandidates(c)
        setVotedCandidateId(voted_candidate_id)
      })
      .catch(() => setError('Failed to load candidates.'))
      .finally(() => setCandidatesLoading(false))
  }, [selected])

  const handleVote = async (candidateId: number) => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await castVote(selected.id, candidateId)
      setVotedCandidateId(candidateId)
      const candidate = candidates.find(c => c.id === candidateId)
      setSuccessMsg(`Your vote for ${candidate?.name} has been recorded.`)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) setError('You have already voted in this election.')
        else setError(err.response?.data?.detail || 'Failed to submit your vote.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="spinner" />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading elections…</p>
      </div>
    )
  }

  if (elections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="text-5xl mb-6 opacity-30">🗓</div>
        <h2 className="display-font text-2xl font-bold mb-2" style={{ color: 'var(--cream)' }}>No Elections Yet</h2>
        <p style={{ color: 'var(--muted)' }}>No elections have been created. Check back later.</p>
      </div>
    )
  }

  const isVotable = selected?.is_active ?? false
  const timeLeft = selected ? new Date(selected.end_time).getTime() - Date.now() : 0
  const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000))

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 relative">
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(212,168,67,0.04) 0%, transparent 60%)' }} />

      {/* Election selector — shown when there are multiple */}
      {elections.length > 1 && (
        <div className="fade-up mb-8">
          <label className="block text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
            Select Election
          </label>
          <div className="flex flex-wrap gap-2">
            {elections.map(e => (
              <button key={e.id} onClick={() => setSelected(e)}
                className="px-4 py-2 text-sm font-medium rounded-sm transition-all duration-150"
                style={{
                  background: selected?.id === e.id ? 'rgba(212,168,67,0.15)' : 'rgba(30,45,74,0.4)',
                  border: selected?.id === e.id ? '1px solid rgba(212,168,67,0.5)' : '1px solid rgba(212,168,67,0.1)',
                  color: selected?.id === e.id ? 'var(--gold)' : 'var(--muted)',
                }}>
                {e.is_active && <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5" style={{ background: '#34d399' }} />}
                {e.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Election header */}
      {selected && (
        <div className="fade-up mb-8">
          <div className="flex items-center gap-2 mb-3">
            {isVotable
              ? <><div className="pulse-dot" /><span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Live Election</span></>
              : <span className="badge-muted">{Date.now() < new Date(selected.start_time).getTime() ? 'UPCOMING' : 'CLOSED'}</span>
            }
          </div>
          <h1 className="display-font text-4xl font-black mb-3" style={{ color: 'var(--cream)', lineHeight: 1.1 }}>
            {selected.title}
          </h1>
          {selected.description && (
            <p className="text-base mb-4" style={{ color: 'var(--muted)' }}>{selected.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <span>Opens {new Date(selected.start_time).toLocaleString()}</span>
            <span style={{ color: 'rgba(212,168,67,0.5)' }}>·</span>
            <span>Closes {new Date(selected.end_time).toLocaleString()}</span>
            {isVotable && hoursLeft > 0 && (
              <><span style={{ color: 'rgba(212,168,67,0.5)' }}>·</span>
              <span style={{ color: 'var(--gold)' }}>{hoursLeft}h remaining</span></>
            )}
          </div>
        </div>
      )}

      <hr style={{ borderColor: 'rgba(212,168,67,0.12)', marginBottom: '2rem' }} />

      {/* Status banners */}
      {successMsg && (
        <div className="fade-up flex items-start gap-3 px-5 py-4 rounded-sm mb-6"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <span style={{ color: '#34d399', fontSize: 18 }}>✓</span>
          <div>
            <p className="font-semibold text-sm mb-0.5" style={{ color: '#34d399' }}>Vote Recorded</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{successMsg}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 text-sm"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
          <span>⚠</span> {error}
        </div>
      )}
      {!isVotable && selected && !error && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 text-sm"
          style={{ background: 'rgba(138,155,181,0.06)', border: '1px solid rgba(138,155,181,0.15)', color: 'var(--muted)' }}>
          <span>🔒</span> This election is not currently open for voting.
        </div>
      )}
      {votedCandidateId && !successMsg && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 text-sm"
          style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.2)', color: 'var(--gold)' }}>
          <span>ℹ</span> You have already cast your vote in this election.
        </div>
      )}

      {/* Candidates */}
      {candidatesLoading ? (
        <div className="flex items-center justify-center py-16"><div className="spinner" /></div>
      ) : (
        <div className="space-y-4">
          {candidates.map((c, i) => (
            <CandidateCard key={c.id} candidate={c}
              hasVoted={!!votedCandidateId || !isVotable}
              votedCandidateId={votedCandidateId}
              onVote={handleVote} isSubmitting={submitting} index={i} />
          ))}
          {candidates.length === 0 && !candidatesLoading && (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              No candidates have been added to this election yet.
            </div>
          )}
        </div>
      )}

      {candidates.length > 0 && (
        <p className="text-center text-xs mt-10" style={{ color: 'var(--muted)' }}>
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} · Votes are final and cannot be changed
        </p>
      )}
    </div>
  )
}