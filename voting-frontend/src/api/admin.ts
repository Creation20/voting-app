import client from './client'
import type { Election, Candidate, ResultsResponse } from './elections'

// ── Admin types ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_voters: number
  total_votes: number
  active_elections: number
  total_elections: number
  voter_turnout_pct: number
  recent_votes: number
}

export interface OrgMember {
  id: number
  username: string
  email: string
  role: string
  organization: number
  org_name: string
  voter_id?: string
  full_name?: string
}

export interface AuditLog {
  id: number
  action: string
  detail: string
  username: string | null
  ip_address: string | null
  created_at: string
}

export interface VoterUploadResult {
  id: number
  filename: string
  total_rows: number
  success_count: number
  error_count: number
  errors: string[]
  created_at: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<DashboardStats> {
  const { data } = await client.get<DashboardStats>('/admin/dashboard/')
  return data
}

// ── Elections ─────────────────────────────────────────────────────────────────

export async function getAdminElections(): Promise<Election[]> {
  const { data } = await client.get<Election[]>('/admin/elections/')
  return data
}

export async function createElection(payload: Partial<Election>): Promise<Election> {
  const { data } = await client.post<Election>('/admin/elections/', payload)
  return data
}

export async function updateElection(id: number, payload: Partial<Election>): Promise<Election> {
  const { data } = await client.patch<Election>(`/admin/elections/${id}/`, payload)
  return data
}

export async function deleteElection(id: number): Promise<void> {
  await client.delete(`/admin/elections/${id}/`)
}

export async function getResults(electionId: number): Promise<ResultsResponse> {
  const { data } = await client.get<ResultsResponse>(`/admin/elections/${electionId}/results/`)
  return data
}

// ── Candidates ────────────────────────────────────────────────────────────────

export async function createCandidate(payload: Partial<Candidate>): Promise<Candidate> {
  const { data } = await client.post<Candidate>('/admin/candidates/', payload)
  return data
}

// ── Voters ────────────────────────────────────────────────────────────────────

export async function getAdminVoters(): Promise<OrgMember[]> {
  const { data } = await client.get<OrgMember[]>('/admin/voters/')
  return data
}

export async function uploadVotersCSV(file: File): Promise<VoterUploadResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<VoterUploadResult>('/admin/voters/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getVoterUploads(): Promise<VoterUploadResult[]> {
  const { data } = await client.get<VoterUploadResult[]>('/admin/voters/upload/')
  return data
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function getAuditLog(): Promise<AuditLog[]> {
  const { data } = await client.get<AuditLog[]>('/admin/audit-log/')
  return data
}

// ── Team Members ──────────────────────────────────────────────────────────────

export interface TeamMember {
  id: number
  name: string
  title: string
  photo_url: string
  order: number
  candidate: number
}

export async function getTeamMembers(candidateId: number): Promise<TeamMember[]> {
  const { data } = await client.get<TeamMember[]>(`/admin/candidates/${candidateId}/team/`)
  return data
}

export async function addTeamMember(candidateId: number, payload: Omit<TeamMember, 'id' | 'candidate'>): Promise<TeamMember> {
  const { data } = await client.post<TeamMember>(`/admin/candidates/${candidateId}/team/`, payload)
  return data
}

export async function updateTeamMember(memberId: number, payload: Partial<TeamMember>): Promise<TeamMember> {
  const { data } = await client.patch<TeamMember>(`/admin/team-members/${memberId}/`, payload)
  return data
}

export async function deleteTeamMember(memberId: number): Promise<void> {
  await client.delete(`/admin/team-members/${memberId}/`)
}