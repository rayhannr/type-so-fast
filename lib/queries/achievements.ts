import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UnlockedAchievement, AchievementInfo } from '@/lib/ags/achievements'
import { PvcData, PvpData, RoomData } from '@/lib/progress'
import { Difficulty } from '@/lib/botDifficulty'
import { authHeaders, AgsSession } from './shared'

export interface AchievementContext {
  accuracy: number
  previousCodes: string[]
  streak: number
  perfectStreak: number
  modesPlayed: string[]
  durationsPlayed: number[]
  pvc?: { difficulty: Difficulty; won: boolean; pvcProgress: PvcData }
  pvp?: { outcome: 'win' | 'lose' | 'tie'; pvpProgress: PvpData }
  room?: { won: boolean; fullHouse: boolean; roomProgress: RoomData }
}

const achievementsKey = (userId: string) => ['achievements', userId] as const

export const useAchievementsQuery = (session: AgsSession | null) => {
  const query = useQuery({
    queryKey: achievementsKey(session?.userId ?? ''),
    queryFn: () =>
      axios.get<UnlockedAchievement[]>('/api/achievements', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })
  return { ...query, data: new Set(query.data?.map((a) => a.achievementCode) ?? []) }
}

// full display list (name/description/unlocked) fetched live from AGS's achievement
// catalog merged with the user's own status — replaces the old hardcoded manifest file
export const useAchievementListQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['achievementList', session?.userId ?? ''],
    queryFn: () =>
      axios.get<AchievementInfo[]>('/api/achievements/list', { headers: authHeaders(session!) }).then((res) => res.data),
    enabled: !!session,
  })

export const useProcessAchievementsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (context: AchievementContext) =>
      axios
        .post<UnlockedAchievement[]>('/api/achievements', context, { headers: authHeaders(session!) })
        .then((res) => res.data),
    onSuccess: (newlyUnlocked) => {
      if (session && newlyUnlocked.length > 0) queryClient.invalidateQueries({ queryKey: achievementsKey(session.userId) })
    },
  })
}
