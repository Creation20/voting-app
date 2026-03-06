import client from './client'

export interface Election {
  id: number
  title: string
  description: string
  start_time: string
  end_time: string
  is_active: boolean
  candidates: Candidate[]
}

export interface Candidate {
  id: number
  name: string
  description: string
  party: string
  motto: string
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
  vote_count: number
  percentage: number
}

export interface ResultsResponse {
  election: Election
  total_votes: number
  results: VoteResult[]
}

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

export async function createCandidate(payload: { name: string; party: string; description: string; election: number }) {
  const { data } = await client.post('/admin/candidates/', payload)
  return data
}

// Superuser endpoints
export async function superuserGetCandidates(): Promise<Candidate[]> {
  const { data } = await client.get<Candidate[]>('/superuser/candidates/')
  return data
}

export async function superuserCreateCandidate(payload: { name: string; party: string; motto: string; description?: string; election: number }): Promise<Candidate> {
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