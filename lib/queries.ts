import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LeaderboardEntry, LeaderboardMetric, LeaderboardRange } from '@/lib/ags/leaderboard'
import type { PersonalStats, GameResultStats } from '@/lib/ags/statistics'
import type { UnlockedAchievement } from '@/lib/ags/achievements'
import type { GameHistoryEntry, StreakData, ProgressionData } from '@/lib/progress'
import type { UserSettings } from '@/lib/ags/cloudsave'
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

export interface AchievementContext {
  accuracy: number
  previousCodes: string[]
  streak: number
  perfectStreak: number
  modesPlayed: string[]
  durationsPlayed: number[]
}

const readLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : fallback
}
const writeLocal = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))

// query keys fall back to a 'local' bucket when there's no AGS session, so cache
// never leaks across signed-in accounts on the same device and guest data stays separate
const queryKeys = {
  records: (userId?: string) => ['records', userId ?? 'local'] as const,
  stats: (userId: string) => ['stats', userId] as const,
  history: (userId?: string) => ['history', userId ?? 'local'] as const,
  streak: (userId?: string) => ['streak', userId ?? 'local'] as const,
  progression: (userId?: string) => ['progression', userId ?? 'local'] as const,
  leaderboard: (filters: { metric: LeaderboardMetric; duration: Duration | null; mode: WordMode; range: LeaderboardRange }) =>
    ['leaderboard', filters] as const,
  displayName: (userId: string) => ['displayName', userId] as const,
  achievements: (userId: string) => ['achievements', userId] as const,
  settings: (userId: string) => ['settings', userId] as const,
}

export const useLoginMutation = () =>
  useMutation({
    mutationFn: (deviceId: string) => axios.post<AgsSession>('/api/auth', { deviceId }).then((res) => res.data),
  })

export const useDisplayNameQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.displayName(session?.userId ?? ''),
    queryFn: async () => {
      const localName = readLocal<string | null>('displayName', null) ?? undefined
      const { data } = await axios.get<{ displayName: string }>('/api/display-name', {
        headers: authHeaders(session!),
        params: localName ? { localName } : undefined,
      })
      writeLocal('displayName', data.displayName)
      return data.displayName
    },
    enabled: !!session,
  })

export const useAchievementsQuery = (session: AgsSession | null) => {
  const query = useQuery({
    queryKey: queryKeys.achievements(session?.userId ?? ''),
    queryFn: () =>
      axios.get<UnlockedAchievement[]>('/api/achievements', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })
  return { ...query, data: new Set(query.data?.map((a) => a.achievementCode) ?? []) }
}

export const useSettingsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.settings(session?.userId ?? ''),
    queryFn: () => axios.get<UserSettings>('/api/settings', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useSaveSettingsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: UserSettings) => axios.put('/api/settings', { settings }, { headers: authHeaders(session!) }),
    onSuccess: (_, settings) => {
      if (session) queryClient.setQueryData(queryKeys.settings(session.userId), settings)
    },
  })
}

export const useRecordsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.records(session?.userId),
    queryFn: () =>
      session
        ? axios.get<number[]>('/api/records', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<number[]>('bestRecords', [])),
    initialData: session ? undefined : () => readLocal<number[]>('bestRecords', []),
  })

export const useHistoryQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.history(session?.userId),
    queryFn: () =>
      session
        ? axios.get<GameHistoryEntry[]>('/api/history', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<GameHistoryEntry[]>('gameHistory', [])),
    initialData: session ? undefined : () => readLocal<GameHistoryEntry[]>('gameHistory', []),
  })

export const useStreakQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.streak(session?.userId),
    queryFn: () =>
      session
        ? axios.get<StreakData | null>('/api/streak', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<StreakData | null>('dailyStreak', null)),
    initialData: session ? undefined : () => readLocal<StreakData | null>('dailyStreak', null),
  })

export const useProgressionQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.progression(session?.userId),
    queryFn: () =>
      session
        ? axios.get<ProgressionData | null>('/api/progression', { headers: authHeaders(session) }).then((res) => res.data)
        : Promise.resolve(readLocal<ProgressionData | null>('progression', null)),
    initialData: session ? undefined : () => readLocal<ProgressionData | null>('progression', null),
  })

export const useStatsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: queryKeys.stats(session?.userId ?? ''),
    queryFn: () => axios.get<PersonalStats>('/api/stats', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useLeaderboardQuery = (filters: {
  metric: LeaderboardMetric
  duration: Duration | null
  mode: WordMode
  range: LeaderboardRange
}) =>
  useQuery({
    queryKey: queryKeys.leaderboard(filters),
    queryFn: () =>
      axios
        .get<LeaderboardEntry[]>('/api/leaderboard', {
          params: { limit: 10, duration: filters.duration ?? undefined, mode: filters.mode, range: filters.range, metric: filters.metric },
        })
        .then((res) => res.data),
  })

export const useSaveRecordsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = queryKeys.records(session?.userId)
  return useMutation({
    mutationFn: async (records: number[]) => {
      if (session) await axios.put('/api/records', { records }, { headers: authHeaders(session) })
      else writeLocal('bestRecords', records)
    },
    onSuccess: (_, records) => queryClient.setQueryData(key, records),
  })
}

export const useSaveHistoryMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = queryKeys.history(session?.userId)
  return useMutation({
    mutationFn: async (entries: GameHistoryEntry[]) => {
      if (session) await axios.put('/api/history', { entries }, { headers: authHeaders(session) })
      else writeLocal('gameHistory', entries)
    },
    onSuccess: (_, entries) => queryClient.setQueryData(key, entries),
  })
}

export const useSaveStreakMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = queryKeys.streak(session?.userId)
  return useMutation({
    mutationFn: async (streak: StreakData) => {
      if (session) await axios.put('/api/streak', { streak }, { headers: authHeaders(session) })
      else writeLocal('dailyStreak', streak)
    },
    onSuccess: (_, streak) => queryClient.setQueryData(key, streak),
  })
}

export const useSaveProgressionMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  const key = queryKeys.progression(session?.userId)
  return useMutation({
    mutationFn: async (progression: ProgressionData) => {
      if (session) await axios.put('/api/progression', { progression }, { headers: authHeaders(session) })
      else writeLocal('progression', progression)
    },
    onSuccess: (_, progression) => queryClient.setQueryData(key, progression),
  })
}

// stats submission also moves the leaderboard, and the server computes the real
// aggregate (increments/max), so this one needs a genuine invalidate + refetch
export const useSubmitStatsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (result: GameResultStats) => axios.post('/api/stats', result, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: queryKeys.stats(session.userId) })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
}

export const useProcessAchievementsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (context: AchievementContext) =>
      axios
        .post<UnlockedAchievement[]>('/api/achievements', context, { headers: authHeaders(session!) })
        .then((res) => res.data),
    onSuccess: (newlyUnlocked) => {
      if (session && newlyUnlocked.length > 0) queryClient.invalidateQueries({ queryKey: queryKeys.achievements(session.userId) })
    },
  })
}
