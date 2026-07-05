import axios from 'axios'
import type { LeaderboardEntry } from './ags/leaderboard'
import type { PersonalStats, GameResultStats } from './ags/statistics'
import type { UnlockedAchievement } from './ags/achievements'

export interface AgsSession {
  userId: string
  accessToken: string
}

const authHeaders = (session: AgsSession) => ({
  Authorization: `Bearer ${session.accessToken}`,
  'X-User-Id': session.userId,
})

export const apiAuth = async (deviceId: string): Promise<AgsSession> => {
  const { data } = await axios.post<AgsSession>('/api/auth', { deviceId })
  return data
}

export const apiGetLeaderboard = async (limit = 10): Promise<LeaderboardEntry[]> => {
  const { data } = await axios.get<LeaderboardEntry[]>('/api/leaderboard', { params: { limit } })
  return data
}

export const apiGetRecords = async (session: AgsSession): Promise<number[]> => {
  const { data } = await axios.get<number[]>('/api/records', { headers: authHeaders(session) })
  return data
}

export const apiSaveRecords = async (session: AgsSession, records: number[]): Promise<void> => {
  await axios.put('/api/records', { records }, { headers: authHeaders(session) })
}

export const apiGetStats = async (session: AgsSession): Promise<PersonalStats> => {
  const { data } = await axios.get<PersonalStats>('/api/stats', { headers: authHeaders(session) })
  return data
}

export const apiSubmitStats = async (session: AgsSession, result: GameResultStats): Promise<void> => {
  await axios.post('/api/stats', result, { headers: authHeaders(session) })
}

export const apiGetAchievements = async (session: AgsSession): Promise<UnlockedAchievement[]> => {
  const { data } = await axios.get<UnlockedAchievement[]>('/api/achievements', { headers: authHeaders(session) })
  return data
}

export const apiProcessAchievements = async (
  session: AgsSession,
  accuracy: number,
  previousCodes: string[]
): Promise<UnlockedAchievement[]> => {
  const { data } = await axios.post<UnlockedAchievement[]>(
    '/api/achievements',
    { accuracy, previousCodes },
    { headers: authHeaders(session) }
  )
  return data
}

export const apiGetDisplayName = async (session: AgsSession, localName?: string): Promise<string> => {
  const { data } = await axios.get<{ displayName: string }>('/api/display-name', {
    headers: authHeaders(session),
    params: localName ? { localName } : undefined,
  })
  return data.displayName
}
