import React from 'react'
import { Candidate } from '../api/elections'

interface Props {
  candidate: Candidate
  hasVoted: boolean
  votedCandidateId: number | null
  onVote: (candidateId: number) => void
  isSubmitting: boolean
  index: number
}

export default function CandidateCard({ candidate, hasVoted, votedCandidateId, onVote, isSubmitting, index }: Props) {
  const isMyVote = votedCandidateId === candidate.id
  const isDisabled = hasVoted || isSubmitting

  return (
    <div className={`fade-up-${Math.min(index + 1, 4)} p-6 rounded-sm transition-all duration-300`}
      style={{
        background: isMyVote ? 'rgba(212,168,67,0.08)' : 'rgba(30,45,74,0.4)',
        border: isMyVote ? '1px solid rgba(212,168,67,0.5)' : '1px solid rgba(212,168,67,0.1)',
      }}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-4 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-sm flex items-center justify-center text-sm font-bold display-font"
            style={{
              background: isMyVote ? 'var(--gold)' : 'rgba(212,168,67,0.12)',
              color: isMyVote ? 'var(--navy)' : 'var(--gold)',
              border: isMyVote ? 'none' : '1px solid rgba(212,168,67,0.2)',
            }}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="display-font text-lg font-bold" style={{ color: 'var(--cream)' }}>
                {candidate.name}
              </h3>
              {isMyVote && <span className="badge-green">✓ YOUR VOTE</span>}
            </div>
            {candidate.party && (
              <p className="text-xs font-semibold mb-1 tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
                {candidate.party}
              </p>
            )}
            {candidate.motto && (
              <p className="text-sm italic mb-2" style={{ color: 'var(--gold)', opacity: 0.8 }}>
                "{candidate.motto}"
              </p>
            )}
            {candidate.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {candidate.description}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {!hasVoted ? (
            <button onClick={() => onVote(candidate.id)} disabled={isDisabled} className="btn-gold text-sm whitespace-nowrap">
              {isSubmitting
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Casting…</>
                : 'Cast Vote'}
            </button>
          ) : (
            <div className="px-4 py-2 text-xs font-semibold rounded-sm tracking-wider"
              style={{
                background: isMyVote ? 'rgba(52,211,153,0.1)' : 'rgba(138,155,181,0.08)',
                color: isMyVote ? '#34d399' : 'var(--muted)',
                border: isMyVote ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(138,155,181,0.15)',
              }}>
              {isMyVote ? '✓ VOTED' : 'NOT SELECTED'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}