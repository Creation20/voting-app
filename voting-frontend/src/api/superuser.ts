import client from './client'
import type { Election, Candidate, ResultsResponse } from './elections'
import type { Organization } from './org'
import type { AuditLog } from './admin'

// ── Superuser types ───────────────────────────────────────────────────────────

export interface SuperuserStats {
  total_orgs: number
  total_voters: number
  total_votes: number
  active_elections: number
  total_elections: number
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function superuserGetDashboard(): Promise<SuperuserStats> {
  const { data } = await client.get<SuperuserStats>('/superuser/dashboard/')
  return data
}

// ── Organisations ─────────────────────────────────────────────────────────────

export async function superuserGetOrgs(): Promise<Organization[]> {
  const { data } = await client.get<Organization[]>('/superuser/orgs/')
  return data
}

export async function superuserCreateOrg(
  payload: Partial<Organization> & {
    owner?: { username: string; email: string; password: string }
  }
): Promise<Organization> {
  const { data } = await client.post<Organization>('/superuser/orgs/', payload)
  return data
}

export async function superuserUpdateOrg(id: number, payload: Partial<Organization>): Promise<Organization> {
  const { data } = await client.patch<Organization>(`/superuser/orgs/${id}/`, payload)
  return data
}

export async function superuserDeleteOrg(id: number): Promise<void> {
  await client.delete(`/superuser/orgs/${id}/`)
}

// ── Elections ─────────────────────────────────────────────────────────────────

export async function superuserGetElections(): Promise<Election[]> {
  const { data } = await client.get<Election[]>('/superuser/elections/')
  return data
}

export async function superuserCreateElection(payload: Partial<Election>): Promise<Election> {
  const { data } = await client.post<Election>('/superuser/elections/', payload)
  return data
}

export async function superuserUpdateElection(id: number, payload: Partial<Election>): Promise<Election> {
  const { data } = await client.patch<Election>(`/superuser/elections/${id}/`, payload)
  return data
}

export async function superuserDeleteElection(id: number): Promise<void> {
  await client.delete(`/superuser/elections/${id}/`)
}

export async function superuserGetResults(electionId: number): Promise<ResultsResponse> {
  const { data } = await client.get<ResultsResponse>(`/superuser/elections/${electionId}/results/`)
  return data
}

// ── Candidates ────────────────────────────────────────────────────────────────

export async function superuserGetCandidates(): Promise<Candidate[]> {
  const { data } = await client.get<Candidate[]>('/superuser/candidates/')
  return data
}

export async function superuserCreateCandidate(payload: Partial<Candidate>): Promise<Candidate> {
  const { data } = await client.post<Candidate>('/superuser/candidates/', payload)
  return data
}

export async function superuserUpdateCandidate(id: number, payload: Partial<Candidate>): Promise<Candidate> {
  const { data } = await client.patch<Candidate>(`/superuser/candidates/${id}/`, payload)
  return data
}

export async function superuserDeleteCandidate(id: number): Promise<void> {
  await client.delete(`/superuser/candidates/${id}/`)
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function superuserGetAuditLog(orgId?: number): Promise<AuditLog[]> {
  const url = orgId ? `/superuser/audit-log/?org_id=${orgId}` : '/superuser/audit-log/'
  const { data } = await client.get<AuditLog[]>(url)
  return data
}

// ── Team Members ──────────────────────────────────────────────────────────────

export async function superuserGetTeamMembers(candidateId: number) {
  const { data } = await client.get(`/superuser/candidates/${candidateId}/team/`)
  return data
}

export async function superuserAddTeamMember(candidateId: number, payload: { name: string; title: string; photo_url: string; order: number }) {
  const { data } = await client.post(`/superuser/candidates/${candidateId}/team/`, payload)
  return data
}

export async function superuserUpdateTeamMember(memberId: number, payload: object) {
  const { data } = await client.patch(`/superuser/team-members/${memberId}/`, payload)
  return data
}

export async function superuserDeleteTeamMember(memberId: number) {
  await client.delete(`/superuser/team-members/${memberId}/`)
}