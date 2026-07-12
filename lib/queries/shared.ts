import axios from 'axios'

export interface AgsSession {
  userId: string
  accessToken: string
}

// Maps an AGS error response's errorCode to a specific user-facing message, falling back to a
// generic one for codes not worth distinguishing in the UI — see the "AGS calls" error-code
// convention in .claude/rules/code-conventions.md.
export const agsErrorMessage = (error: unknown, messages: Record<number, string>, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const errorCode = (error.response?.data as { errorCode?: number } | undefined)?.errorCode
    if (errorCode !== undefined && messages[errorCode]) return messages[errorCode]
  }
  return fallback
}

export const authHeaders = (session: AgsSession) => ({
  Authorization: `Bearer ${session.accessToken}`,
  'X-User-Id': session.userId
})

export const readLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : fallback
}

export const writeLocal = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
