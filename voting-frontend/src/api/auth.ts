import client from './client'

export interface LoginResponse {
  access: string
  refresh: string
  role: string
  username: string
  email: string
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login/', { username, password })
  return data
}

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export async function getMe() {
  const { data } = await client.get('/me/')
  return data
}
