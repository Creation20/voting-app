import React, { useEffect, useState, useRef } from 'react'
import { getAdminVoters, uploadVotersCSV, getVoterUploads } from '../api/admin'
import type { OrgMember, VoterUploadResult } from '../api/admin'

export default function AdminVotersPage() {
  const [voters, setVoters] = useState<OrgMember[]>([])
  const [uploads, setUploads] = useState<VoterUploadResult[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'upload'>('list')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<VoterUploadResult | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (m: string, isErr = false) => {
    if (isErr) { setError(m); setMsg('') } else { setMsg(m); setError('') }
    setTimeout(() => { setMsg(''); setError('') }, 5000)
  }

  const load = async () => {
    try {
      const [v, u] = await Promise.all([getAdminVoters(), getVoterUploads()])
      setVoters(v); setUploads(u)
    } catch { flash('Failed to load voters.', true) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadResult(null)
    try {
      const result = await uploadVotersCSV(file)
      setUploadResult(result)
      flash(`Upload complete: ${result.success_count} voters added.`)
      load()
    } catch (err: any) {
      flash(err?.response?.data?.detail || 'Upload failed.', true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filteredVoters = voters.filter(v =>
    v.username.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase()) ||
    (v.voter_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="spinner" /><p className="text-sm" style={{ color: 'var(--muted)' }}>Loading voters…</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="fade-up">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>Admin Panel</p>
        <h1 className="display-font text-4xl font-black" style={{ color: 'var(--cream)' }}>Voter Management</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{voters.length} registered voters</p>
      </div>

      {msg && <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
        style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)', color: 'var(--success)' }}>✓ {msg}</div>}
      {error && <div className="flex items-center gap-2 px-4 py-3 rounded-sm text-sm"
        style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)', color: 'var(--danger)' }}>⚠ {error}</div>}

      <div className="flex gap-1 p-1 rounded-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {(['list', 'upload'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm font-semibold rounded-sm capitalize transition-all"
            style={{ background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'var(--bg)' : 'var(--muted)' }}>
            {t === 'list' ? `👥 Voters (${voters.length})` : '📤 Upload CSV'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="space-y-4">
          <input className="input-field fade-up-1" placeholder="Search by username, email, voter ID, name…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="glass-card overflow-hidden fade-up-2">
            {filteredVoters.length === 0 ? (
              <div className="p-10 text-center" style={{ color: 'var(--muted)' }}>
                {search ? 'No voters match your search.' : 'No voters registered yet. Upload a CSV to add voters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {['Username', 'Full Name', 'Email', 'Voter ID', 'Role'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoters.map((v, i) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid color-mix(in srgb, var(--card-border) 50%, transparent)', background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-light) 20%, transparent)' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--cream)' }}>{v.username}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{v.full_name || '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{v.email}</td>
                        <td className="px-4 py-3">
                          {v.voter_id
                            ? <span className="text-xs font-mono px-2 py-0.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}>{v.voter_id}</span>
                            : <span style={{ color: 'var(--muted)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-sm font-semibold"
                            style={{ color: v.role === 'ADMIN' ? 'var(--accent)' : 'var(--muted)', background: v.role === 'ADMIN' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'color-mix(in srgb, var(--muted) 10%, transparent)', border: '1px solid color-mix(in srgb, currentColor 25%, transparent)' }}>
                            {v.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="space-y-6">
          <div className="glass-card p-6 fade-up-1">
            <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>CSV Format</h2>
            <div className="overflow-x-auto mb-4">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr>
                    {['username *', 'email *', 'password *', 'voter_id', 'full_name'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold"
                        style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[['jdoe', 'jdoe@school.edu', 'SecurePass1!', 'STU-001', 'John Doe'], ['asmith', 'asmith@school.edu', 'SecurePass2!', 'STU-002', 'Alice Smith']].map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => (
                      <td key={j} className="px-3 py-2" style={{ color: 'var(--muted)', border: '1px solid color-mix(in srgb, var(--card-border) 50%, transparent)' }}>{cell}</td>
                    ))}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => {
              const csv = 'username,email,password,voter_id,full_name\njdoe,jdoe@example.com,SecurePass1!,STU-001,John Doe'
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'voters_template.csv'; a.click()
              URL.revokeObjectURL(url)
            }} className="btn-ghost text-sm">⬇ Download Template</button>
          </div>

          <div className="glass-card p-6 fade-up-2">
            <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>Upload File</h2>
            <label className="flex flex-col items-center justify-center gap-3 p-10 rounded-sm cursor-pointer transition-all"
              style={{ border: '2px dashed color-mix(in srgb, var(--accent) 35%, transparent)', background: 'color-mix(in srgb, var(--accent) 3%, transparent)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) { const dt = new DataTransfer(); dt.items.add(file); if (fileRef.current) { fileRef.current.files = dt.files; fileRef.current.dispatchEvent(new Event('change', { bubbles: true })) } }
              }}>
              <div className="text-4xl opacity-50">📂</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{uploading ? 'Uploading…' : 'Click to select or drag & drop your CSV'}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>.csv files only</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} disabled={uploading} />
              {uploading && <div className="spinner" />}
            </label>
          </div>

          {uploadResult && (
            <div className="glass-card p-6 fade-up space-y-4">
              <h2 className="display-font text-lg font-bold" style={{ color: 'var(--cream)' }}>Upload Result</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--muted) 8%, transparent)', border: '1px solid var(--card-border)' }}>
                  <p className="text-2xl font-black display-font" style={{ color: 'var(--cream)' }}>{uploadResult.total_rows}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Total Rows</p>
                </div>
                <div className="text-center p-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }}>
                  <p className="text-2xl font-black display-font" style={{ color: 'var(--success)' }}>{uploadResult.success_count}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Added</p>
                </div>
                <div className="text-center p-3 rounded-sm" style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                  <p className="text-2xl font-black display-font" style={{ color: 'var(--danger)' }}>{uploadResult.error_count}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Errors</p>
                </div>
              </div>
              {uploadResult.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--danger)' }}>Errors</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {uploadResult.errors.map((e, i) => (
                      <p key={i} className="text-xs px-3 py-1.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--danger) 6%, transparent)', color: 'var(--danger)' }}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {uploads.length > 0 && (
            <div className="glass-card p-6 fade-up-3">
              <h2 className="display-font text-lg font-bold mb-4" style={{ color: 'var(--cream)' }}>Upload History</h2>
              <div className="space-y-2">
                {uploads.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-sm flex-wrap gap-2"
                    style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--card-border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{u.filename}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span style={{ color: 'var(--success)' }}>+{u.success_count}</span>
                      {u.error_count > 0 && <span style={{ color: 'var(--danger)' }}>✗{u.error_count}</span>}
                      <span style={{ color: 'var(--muted)' }}>{u.total_rows} rows</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}