import client from './client'
import type { OrgMember } from './admin'

// ── Org types ─────────────────────────────────────────────────────────────────

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

// ── Org owner API calls ───────────────────────────────────────────────────────

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