export interface AgsSession {
  userId: string
  accessToken: string
}

export const authHeaders = (session: AgsSession) => ({
  Authorization: `Bearer ${session.accessToken}`,
  'X-User-Id': session.userId,
})

export const readLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : fallback
}

export const writeLocal = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
