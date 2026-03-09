import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllElections, getCandidates, castVote, Election, Candidate } from '../api/elections'
import CandidateCard from '../components/CandidateCard'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const AUTO_LOGOUT_SECONDS = 10

export default function CandidateListPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [elections, setElections] = useState<Election[]>([])
  const [selected, setSelected] = useState<Election | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [votedCandidateId, setVotedCandidateId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [justVoted, setJustVoted] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_LOGOUT_SECONDS)

  useEffect(() => {
    getAllElections()
      .then(data => {
        setElections(data)
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
    setJustVoted(false)
    getCandidates(selected.id)
      .then(({ candidates: c, voted_candidate_id }) => {
        setCandidates(c)
        setVotedCandidateId(voted_candidate_id)
      })
      .catch(() => setError('Failed to load candidates.'))
      .finally(() => setCandidatesLoading(false))
  }, [selected])

  // Auto-logout countdown after voting
  useEffect(() => {
    if (!justVoted) return
    setCountdown(AUTO_LOGOUT_SECONDS)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          logout()
          navigate('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [justVoted, logout, navigate])

  const handleVote = async (candidateId: number) => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await castVote(selected.id, candidateId)
      setVotedCandidateId(candidateId)
      const candidate = candidates.find(c => c.id === candidateId)
      setSuccessMsg(`Your vote for ${candidate?.name} has been recorded.`)
      setJustVoted(true)
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
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 0%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 60%)' }} />

      {/* Election selector */}
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
                  background: selected?.id === e.id ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'color-mix(in srgb, var(--bg-light) 60%, transparent)',
                  border: selected?.id === e.id ? '1px solid color-mix(in srgb, var(--accent) 50%, transparent)' : '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: selected?.id === e.id ? 'var(--accent)' : 'var(--muted)',
                }}>
                {e.is_active && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5" style={{ background: 'var(--success)' }} />
                )}
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
              ? <><div className="pulse-dot" /><span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Live Election</span></>
              : <span className="badge-muted">{Date.now() < new Date(selected.start_time).getTime() ? 'UPCOMING' : selected.status}</span>
            }
          </div>
          <h1 className="display-font text-4xl font-black mb-3" style={{ color: 'var(--cream)', lineHeight: 1.1 }}>
            {selected.title}
          </h1>
          {selected.description && (
            <p className="text-base mb-4" style={{ color: 'var(--muted)' }}>{selected.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <span>Opens {new Date(selected.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span style={{ color: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}>·</span>
            <span>Closes {new Date(selected.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            {isVotable && hoursLeft > 0 && (
              <><span style={{ color: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}>·</span>
              <span style={{ color: 'var(--accent)' }}>{hoursLeft}h remaining</span></>
            )}
          </div>
        </div>
      )}

      <hr style={{ borderColor: 'var(--card-border)', marginBottom: '2rem' }} />

      {/* Auto-logout countdown banner */}
      {justVoted && (
        <div className="fade-up flex items-center justify-between px-5 py-4 rounded-sm mb-6"
          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>Vote recorded! Signing you out…</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>You will be automatically logged out for security.</p>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center display-font text-xl font-black"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            {countdown}
          </div>
        </div>
      )}

      {/* Banners */}
      {successMsg && !justVoted && (
        <div className="fade-up flex items-start gap-3 px-5 py-4 rounded-sm mb-6"
          style={{ background: 'color-mix(in srgb, var(--success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)' }}>
          <span style={{ color: 'var(--success)', fontSize: 18 }}>✓</span>
          <div>
            <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--success)' }}>Vote Recorded</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{successMsg}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 text-sm"
          style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)' }}>
          <span>⚠</span> {error}
        </div>
      )}
      {!isVotable && selected && !error && !justVoted && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 text-sm"
          style={{ background: 'color-mix(in srgb, var(--muted) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--muted) 15%, transparent)', color: 'var(--muted)' }}>
          <span>🔒</span> This election is not currently open for voting.
        </div>
      )}
      {votedCandidateId && !successMsg && !justVoted && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-sm mb-6 text-sm"
          style={{ background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}>
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
          {candidates.length === 0 && (
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