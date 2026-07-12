import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { PersonalStats, GameResultStats } from '@/lib/ags/statistics'
import { authHeaders, AgsSession } from './shared'

export const useStatsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['stats', session?.userId ?? ''],
    queryFn: () => axios.get<PersonalStats>('/api/stats', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

// stats submission also moves the leaderboard, and the server computes the real
// aggregate (increments/max), so this one needs a genuine invalidate + refetch
export const useSubmitStatsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (result: GameResultStats) => axios.post('/api/stats', result, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: ['stats', session.userId] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    }
  })
}
