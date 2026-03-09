import client from './client'

// ── Shared types ──────────────────────────────────────────────────────────────

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

export interface TeamMember {
  id: number
  name: string
  title: string
  photo_url: string
  order: number
  candidate: number
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
  team_members?: TeamMember[]
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

// ── Voter-facing API calls ────────────────────────────────────────────────────

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

export async function lookupOrgByCode(joinCode: string) {
  const { data } = await client.get(`/org/lookup/${joinCode}/`)
  return data
}