import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { UnlockedAchievement, AchievementInfo, GlobalAchievement } from '@/lib/ags/achievements'
import { Difficulty } from '@/lib/botDifficulty'
import { PvcData, PvpData, RoomData } from '@/lib/progress'
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
    queryFn: () => axios.get<UnlockedAchievement[]>('/api/achievements', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })
  return { ...query, data: new Set(query.data?.map(a => a.achievementCode) ?? []) }
}

// full display list (name/description/unlocked) fetched live from AGS's achievement
// catalog merged with the user's own status, replaces the old hardcoded manifest file
export const useAchievementListQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: ['achievementList', session?.userId ?? ''],
    queryFn: () => axios.get<AchievementInfo[]>('/api/achievements/list', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

const globalAchievementsKey = (userId: string) => ['globalAchievements', userId] as const
const badgeOwnersKey = ['communityBadgeOwners'] as const

export const useGlobalAchievementsQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: globalAchievementsKey(session?.userId ?? ''),
    queryFn: () => axios.get<GlobalAchievement[]>('/api/achievements/global', { headers: authHeaders(session!) }).then(res => res.data),
    enabled: !!session
  })

// the badge is granted by AGS's reward config reacting to the claim event, not by the claim
// call itself, so both the claimable flag and the owner list need a server refetch afterwards
export const useClaimGlobalAchievementMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => axios.post(`/api/achievements/global/${code}/claim`, null, { headers: authHeaders(session!) }),
    onSuccess: () => {
      if (session) queryClient.invalidateQueries({ queryKey: globalAchievementsKey(session.userId) })
      queryClient.invalidateQueries({ queryKey: badgeOwnersKey })
    }
  })
}

export const useCommunityBadgeOwnersQuery = () => {
  const query = useQuery({
    queryKey: badgeOwnersKey,
    queryFn: () => axios.get<string[]>('/api/achievements/global/badge-owners').then(res => res.data)
  })
  return { ...query, data: new Set(query.data ?? []) }
}

export const useProcessAchievementsMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (context: AchievementContext) =>
      axios.post<UnlockedAchievement[]>('/api/achievements', context, { headers: authHeaders(session!) }).then(res => res.data),
    onSuccess: newlyUnlocked => {
      if (session && newlyUnlocked.length > 0) queryClient.invalidateQueries({ queryKey: achievementsKey(session.userId) })
    }
  })
}
