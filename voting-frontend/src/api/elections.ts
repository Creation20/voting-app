import client from './client'

export interface Election {
  id: number
  title: string
  description: string
  start_time: string
  end_time: string
  is_active: boolean
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  candidates: Candidate[]
  organization: number
  org_name?: string
  total_votes?: number
  voter_count?: number
}

export interface Candidate {
  id: number
  name: string
  description: string
  party: string
  motto: string
  position: string
  photo_url: string
  manifesto: string
  election: number
  vote_count?: number
}

export interface CandidatesResponse {
  candidates: Candidate[]
  voted_candidate_id: number | null
}

export interface VoteResult {
  id: number
  name: string
  party: string
  motto: string
  description: string
  position: string
  photo_url: string
  vote_count: number
  percentage?: number
}

export interface ResultsResponse {
  election: Election
  total_votes: number
  results: VoteResult[]
}

export interface Organization {
  id: number
  name: string
  slug: string
  org_type: string
  description: string
  join_code: string
  logo_url: string
  is_active: boolean
  member_count: number
  election_count: number
  created_at: string
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

export interface DashboardStats {
  total_voters: number
  total_votes: number
  active_elections: number
  total_elections: number
  voter_turnout_pct: number
  recent_votes: number
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

// ── Elections ──────────────────────────────────────────────────────────────

export async function getActiveElection(): Promise<Election> {
  const { data } = await client.get<Election>('/elections/active/')
  return data
}

export async function getAllElections(): Promise<Election[]> {
  const { data } = await client.get<Election[]>('/elections/')
  return data
}

export async function getCandidates(electionId: number): Promise<CandidatesResponse> {
  const { data } = await client.get<CandidatesResponse>(`/elections/${electionId}/candidates/`)
  return data
}

export async function castVote(electionId: number, candidateId: number) {
  const { data } = await client.post(`/elections/${electionId}/vote/`, { candidate_id: candidateId })
  return data
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<DashboardStats> {
  const { data } = await client.get<DashboardStats>('/admin/dashboard/')
  return data
}

export async function getResults(electionId: number): Promise<ResultsResponse> {
  const { data } = await client.get<ResultsResponse>(`/admin/elections/${electionId}/results/`)
  return data
}

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

export async function createCandidate(payload: Partial<Candidate>): Promise<Candidate> {
  const { data } = await client.post<Candidate>('/admin/candidates/', payload)
  return data
}

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

export async function getAuditLog(): Promise<AuditLog[]> {
  const { data } = await client.get<AuditLog[]>('/admin/audit-log/')
  return data
}

// ── Organisation ───────────────────────────────────────────────────────────

export async function lookupOrgByCode(joinCode: string) {
  const { data } = await client.get(`/org/lookup/${joinCode}/`)
  return data
}

export async function getOrgSettings(): Promise<Organization> {
  const { data } = await client.get<Organization>('/org/settings/')
  return data
}

export async function updateOrgSettings(payload: Partial<Organization>): Promise<Organization> {
  const { data } = await client.patch<Organization>('/org/settings/', payload)
  return data
}

export async function regenerateJoinCode(): Promise<{ join_code: string }> {
  const { data } = await client.post('/org/regenerate-code/')
  return data
}

export async function getOrgMembers(): Promise<OrgMember[]> {
  const { data } = await client.get<OrgMember[]>('/org/members/')
  return data
}

export async function updateMemberRole(userId: number, role: string): Promise<OrgMember> {
  const { data } = await client.patch<OrgMember>(`/org/members/${userId}/`, { role })
  return data
}

export async function removeMember(userId: number): Promise<void> {
  await client.delete(`/org/members/${userId}/`)
}

// ── Superuser org management ───────────────────────────────────────────────

export async function superuserGetOrgs(): Promise<Organization[]> {
  const { data } = await client.get<Organization[]>('/superuser/orgs/')
  return data
}

export async function superuserCreateOrg(payload: Partial<Organization> & { owner?: { username: string; email: string; password: string } }): Promise<Organization> {
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

export async function superuserGetAuditLog(orgId?: number): Promise<AuditLog[]> {
  const url = orgId ? `/superuser/audit-log/?org_id=${orgId}` : '/superuser/audit-log/'
  const { data } = await client.get<AuditLog[]>(url)
  return data
}

export interface SuperuserStats {
  total_orgs: number
  total_voters: number
  total_votes: number
  active_elections: number
  total_elections: number
}

export async function superuserGetDashboard(): Promise<SuperuserStats> {
  const { data } = await client.get<SuperuserStats>('/superuser/dashboard/')
  return data
}