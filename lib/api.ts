import axios from 'axios'
import type { LeaderboardEntry, LeaderboardMetric, LeaderboardRange } from './ags/leaderboard'
import type { PersonalStats, GameResultStats } from './ags/statistics'
import type { UnlockedAchievement } from './ags/achievements'
import type { GameHistoryEntry, ProgressionData, StreakData } from './progress'
import type { UserSettings } from './ags/cloudsave'
import type { Duration } from '@/components/DurationSelector'
import type { WordMode } from '@/lib/word-generators'

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

interface LeaderboardFilters {
  limit?: number
  duration?: Duration | null
  mode?: WordMode
  range?: LeaderboardRange
  metric?: LeaderboardMetric
}

export const apiGetLeaderboard = async ({ limit = 10, duration, mode, range, metric }: LeaderboardFilters = {}): Promise<
  LeaderboardEntry[]
> => {
  const { data } = await axios.get<LeaderboardEntry[]>('/api/leaderboard', {
    params: { limit, duration: duration ?? undefined, mode, range, metric },
  })
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

export const apiGetHistory = async (session: AgsSession): Promise<GameHistoryEntry[]> => {
  const { data } = await axios.get<GameHistoryEntry[]>('/api/history', { headers: authHeaders(session) })
  return data
}

export const apiSaveHistory = async (session: AgsSession, entries: GameHistoryEntry[]): Promise<void> => {
  await axios.put('/api/history', { entries }, { headers: authHeaders(session) })
}

export const apiGetStreak = async (session: AgsSession): Promise<StreakData | null> => {
  const { data } = await axios.get<StreakData | null>('/api/streak', { headers: authHeaders(session) })
  return data
}

export const apiSaveStreak = async (session: AgsSession, streak: StreakData): Promise<void> => {
  await axios.put('/api/streak', { streak }, { headers: authHeaders(session) })
}

export const apiGetProgression = async (session: AgsSession): Promise<ProgressionData | null> => {
  const { data } = await axios.get<ProgressionData | null>('/api/progression', { headers: authHeaders(session) })
  return data
}

export const apiSaveProgression = async (session: AgsSession, progression: ProgressionData): Promise<void> => {
  await axios.put('/api/progression', { progression }, { headers: authHeaders(session) })
}

export const apiGetAchievements = async (session: AgsSession): Promise<UnlockedAchievement[]> => {
  const { data } = await axios.get<UnlockedAchievement[]>('/api/achievements', { headers: authHeaders(session) })
  return data
}

interface AchievementContext {
  accuracy: number
  previousCodes: string[]
  streak: number
  perfectStreak: number
  modesPlayed: string[]
  durationsPlayed: number[]
}

export const apiProcessAchievements = async (
  session: AgsSession,
  context: AchievementContext
): Promise<UnlockedAchievement[]> => {
  const { data } = await axios.post<UnlockedAchievement[]>('/api/achievements', context, {
    headers: authHeaders(session),
  })
  return data
}

export const apiGetSettings = async (session: AgsSession): Promise<UserSettings> => {
  const { data } = await axios.get<UserSettings>('/api/settings', { headers: authHeaders(session) })
  return data
}

export const apiSaveSettings = async (session: AgsSession, settings: UserSettings): Promise<void> => {
  await axios.put('/api/settings', { settings }, { headers: authHeaders(session) })
}

export const apiGetDisplayName = async (session: AgsSession, localName?: string): Promise<string> => {
  const { data } = await axios.get<{ displayName: string }>('/api/display-name', {
    headers: authHeaders(session),
    params: localName ? { localName } : undefined,
  })
  return data.displayName
}
