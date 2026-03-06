import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getAdminElections, getResults, Election, ResultsResponse } from '../api/elections'

const COLORS = ['#d4a843', '#6366f1', '#34d399', '#f59e0b', '#ec4899', '#60a5fa']

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; vote_count: number; percentage: number } }> }) => {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (
      <div className="px-4 py-3 rounded-sm text-sm"
        style={{ background: 'var(--navy-mid)', border: '1px solid rgba(212,168,67,0.3)' }}>
        <p className="font-bold mb-1" style={{ color: 'var(--cream)' }}>{d.name}</p>
        <p style={{ color: 'var(--gold)' }}>{d.vote_count} votes · {d.percentage}%</p>
      </div>
    )
  }
  return null
}

export default function AdminResultsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminElections()
      .then(data => { setElections(data); if (data.length > 0) setSelectedId(data[0].id) })
      .catch(() => setError('Failed to load elections.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setResultsLoading(true)
    getResults(selectedId)
      .then(setResults)
      .catch(() => setError('Failed to load results.'))
      .finally(() => setResultsLoading(false))
  }, [selectedId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="spinner" />
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading elections…</p>
      </div>
    )
  }

  const leader = results?.results[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="fade-up mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Election Results</h1>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-sm text-sm mb-6"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {elections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4 opacity-20">📊</div>
          <p className="display-font text-xl" style={{ color: 'var(--muted)' }}>No elections found</p>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)', opacity: 0.6 }}>Create an election from the Manage page</p>
        </div>
      ) : (
        <>
          <div className="fade-up-1 glass-card p-5 mb-6 flex flex-wrap items-center gap-4">
            <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Election</label>
            <select value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value))}
              className="input-field max-w-xs text-sm py-2">
              {elections.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          {resultsLoading ? (
            <div className="flex items-center justify-center py-24"><div className="spinner" /></div>
          ) : results ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 fade-up-2">
                {[
                  { label: 'Total Votes', value: results.total_votes, color: 'var(--gold)' },
                  { label: 'Candidates', value: results.results.length, color: '#6366f1' },
                  { label: 'Leading', value: leader?.name ?? '—', color: '#34d399', small: true },
                ].map(({ label, value, color, small }) => (
                  <div key={label} className="glass-card p-5 text-center">
                    <p className={`font-black display-font mb-1 ${small ? 'text-xl' : 'text-4xl'}`} style={{ color }}>{value}</p>
                    <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {results.total_votes > 0 && (
                <div className="glass-card p-6 mb-6 fade-up-3">
                  <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--muted)' }}>Vote Distribution</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={results.results} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,168,67,0.07)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212,168,67,0.04)' }} />
                      <Bar dataKey="vote_count" radius={[4, 4, 0, 0]}>
                        {results.results.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                            style={{ color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>
                            {i === 0 ? '★' : `#${i + 1}`}
                          </span>
                          <div>
                            <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{r.name}</span>
                            {r.party && <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{r.party}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                          {r.vote_count} <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>({r.percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden ml-9" style={{ background: 'rgba(138,155,181,0.12)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${r.percentage}%`, background: COLORS[i % COLORS.length] }} />
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
  )
}