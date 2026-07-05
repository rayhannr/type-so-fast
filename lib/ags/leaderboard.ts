import { Leaderboard } from '@accelbyte/sdk-leaderboard'
import { createSdk } from './sdk'

export const LEADERBOARD_CODE = 'wpm-alltime'

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  wpm: number
}

export const getTopLeaderboard = async (limit = 10): Promise<LeaderboardEntry[]> => {
  const sdk = createSdk()
  const leaderboardDataApi = Leaderboard.LeaderboardDataV3Api(sdk)
  const { data } = await leaderboardDataApi.getAlltime_ByLeaderboardCode_v3(LEADERBOARD_CODE, { limit })

  return data.data.map((entry: { additionalData: Record<string, unknown>; point: number; userId: string }, index: number) => ({
    rank: index + 1,
    userId: entry.userId,
    displayName: (entry.additionalData?.displayName as string | undefined) ?? entry.userId.slice(0, 8),
    wpm: entry.point,
  }))
}
