import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import type { LeaderboardEntry, LeaderboardMetric, LeaderboardRange } from '@/lib/ags/leaderboard'
import type { Duration } from '@/components/DurationSelector'
import type { WordMode } from '@/lib/word-generators'

export const useLeaderboardQuery = (filters: {
  metric: LeaderboardMetric
  duration: Duration | null
  mode: WordMode
  range: LeaderboardRange
}) =>
  useQuery({
    queryKey: ['leaderboard', filters],
    queryFn: () =>
      axios
        .get<LeaderboardEntry[]>('/api/leaderboard', {
          params: { limit: 10, duration: filters.duration ?? undefined, mode: filters.mode, range: filters.range, metric: filters.metric },
        })
        .then((res) => res.data),
  })
