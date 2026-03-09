import React, { useState } from 'react'
import { Candidate, TeamMember } from '../api/elections'

interface Props {
  candidate: Candidate
  hasVoted: boolean
  votedCandidateId: number | null
  onVote: (candidateId: number) => void
  isSubmitting: boolean
  index: number
}

function TeamMemberAvatar({ member }: { member: TeamMember }) {
  const initials = member.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="flex items-center gap-2.5">
      {member.photo_url ? (
        <img
          src={member.photo_url}
          alt={member.name}
          className="w-8 h-8 rounded-sm object-cover shrink-0"
          style={{ border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold display-font shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
          }}>
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--cream)' }}>
          {member.name}
        </p>
        {member.title && (
          <p className="text-xs leading-tight truncate" style={{ color: 'var(--muted)', opacity: 0.8 }}>
            {member.title}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CandidateCard({ candidate, hasVoted, votedCandidateId, onVote, isSubmitting, index }: Props) {
  const isMyVote = votedCandidateId === candidate.id
  const isDisabled = hasVoted || isSubmitting
  const [confirming, setConfirming] = useState(false)
  const [showManifesto, setShowManifesto] = useState(false)

  const team = candidate.team_members ?? []

  const handleClick = () => { if (isDisabled) return; setConfirming(true) }
  const handleConfirm = () => { setConfirming(false); onVote(candidate.id) }
  const handleCancel = () => setConfirming(false)

  return (
    <div
      className={`fade-up-${Math.min(index + 1, 4)} p-6 rounded-sm transition-all duration-300`}
      style={{
        background: isMyVote ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--card-bg)',
        border: isMyVote ? '1px solid color-mix(in srgb, var(--accent) 50%, transparent)' : '1px solid var(--card-border)',
      }}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-4 flex-1 min-w-0">
          {candidate.photo_url ? (
            <img
              src={candidate.photo_url}
              alt={candidate.name}
              className="shrink-0 w-14 h-14 rounded-sm object-cover"
              style={{ border: '2px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div
              className="shrink-0 w-10 h-10 rounded-sm flex items-center justify-center text-sm font-bold display-font"
              style={{
                background: isMyVote ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: isMyVote ? 'var(--bg)' : 'var(--accent)',
                border: isMyVote ? 'none' : '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
              }}>
              {String(index + 1).padStart(2, '0')}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="display-font text-lg font-bold" style={{ color: 'var(--cream)' }}>{candidate.name}</h3>
              {isMyVote && <span className="badge-green">✓ YOUR VOTE</span>}
            </div>

            {candidate.position && (
              <p className="text-xs font-semibold mb-1 tracking-widest uppercase" style={{ color: 'var(--cream)', opacity: 0.7 }}>
                {candidate.position}
              </p>
            )}
            {candidate.party && (
              <p className="text-xs font-semibold mb-1 tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
                {candidate.party}
              </p>
            )}
            {candidate.motto && (
              <p className="text-sm italic mb-2" style={{ color: 'var(--accent)', opacity: 0.75 }}>
                "{candidate.motto}"
              </p>
            )}
            {candidate.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {candidate.description}
              </p>
            )}

            {/* ── Running Team ──────────────────────────────────────── */}
            {team.length > 0 && (
              <div
                className="mt-4 p-3 rounded-sm"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 3%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
                }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                  Running Team
                </p>
                <div className={`grid gap-2.5 ${team.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {team.map(member => <TeamMemberAvatar key={member.id} member={member} />)}
                </div>
              </div>
            )}

            {/* Manifesto toggle */}
            {candidate.manifesto && (
              <div className="mt-3">
                <button onClick={() => setShowManifesto(!showManifesto)} className="text-xs font-semibold tracking-wide transition-all" style={{ color: 'var(--accent)' }}>
                  {showManifesto ? '▲ Hide manifesto' : '▼ Read manifesto'}
                </button>
                {showManifesto && (
                  <div className="mt-2 p-3 rounded-sm text-sm leading-relaxed"
                    style={{ background: 'color-mix(in srgb, var(--accent) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--muted)' }}>
                    {candidate.manifesto}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {hasVoted ? (
            <div className="px-4 py-2 text-xs font-semibold rounded-sm tracking-wider"
              style={{
                background: isMyVote ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--muted) 8%, transparent)',
                color: isMyVote ? 'var(--success)' : 'var(--muted)',
                border: isMyVote ? '1px solid color-mix(in srgb, var(--success) 30%, transparent)' : '1px solid color-mix(in srgb, var(--muted) 20%, transparent)',
              }}>
              {isMyVote ? '✓ VOTED' : 'NOT SELECTED'}
            </div>
          ) : confirming ? (
            <div className="flex flex-col gap-2 items-end">
              <p className="text-xs text-right" style={{ color: 'var(--muted)' }}>Confirm your vote?</p>
              <div className="flex gap-2">
                <button onClick={handleCancel} className="text-xs px-3 py-1.5 rounded-sm font-medium transition-all"
                  style={{ border: '1px solid color-mix(in srgb, var(--muted) 30%, transparent)', color: 'var(--muted)', background: 'transparent' }}>
                  Cancel
                </button>
                <button onClick={handleConfirm} disabled={isSubmitting} className="btn-accent text-xs px-4 py-1.5">
                  {isSubmitting ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Casting…</> : '✓ Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleClick} disabled={isDisabled} className="btn-accent text-sm whitespace-nowrap">
              Cast Vote
            </button>
          )}
        </div>
      </div>
    </div>
  )
}