import { Leaderboard } from '@accelbyte/sdk-leaderboard'
import { createSdk } from './sdk'
import type { Duration } from '@/components/DurationSelector'
import type { WordMode } from '@/lib/word-generators'

export const LEADERBOARD_CODE = 'wpm-alltime'
export const XP_LEADERBOARD_CODE = 'xp-alltime'
export const WEEKLY_CYCLE_ID = 'weekly'

export type LeaderboardRange = 'alltime' | 'weekly'
export type LeaderboardMetric = 'wpm' | 'xp'

const DURATION_LEADERBOARD_CODE: Record<Duration, string> = {
  15: 'wpm-15s',
  30: 'wpm-30s',
  60: 'wpm-60s',
  120: 'wpm-120s',
}

const MODE_LEADERBOARD_CODE: Record<LeaderboardRange, Record<WordMode, string>> = {
  alltime: {
    words: 'wpm-alltime',
    numbers: 'wpm-alltime-numbers',
    punctuation: 'wpm-alltime-punctuation',
  },
  weekly: {
    words: 'wpm-weekly-words',
    numbers: 'wpm-weekly-numbers',
    punctuation: 'wpm-weekly-punctuation',
  },
}

export const getDurationLeaderboardCode = (duration: Duration): string => DURATION_LEADERBOARD_CODE[duration]

export const getModeLeaderboardCode = (mode: WordMode, range: LeaderboardRange): string => MODE_LEADERBOARD_CODE[range][mode]

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  wpm: number
}

// leaderboard "point" is generic: wpm for the wpm boards, total XP for the xp board

const mapEntries = (data: { additionalData: Record<string, unknown>; point: number; userId: string }[]): LeaderboardEntry[] =>
  data.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    displayName: (entry.additionalData?.displayName as string | undefined) ?? entry.userId.slice(0, 8),
    wpm: entry.point,
  }))

export const getTopLeaderboard = async (
  limit = 10,
  leaderboardCode: string = LEADERBOARD_CODE,
  cycleId?: string
): Promise<LeaderboardEntry[]> => {
  const sdk = createSdk()
  const leaderboardDataApi = Leaderboard.LeaderboardDataV3Api(sdk)

  try {
    const { data } = cycleId
      ? await leaderboardDataApi.getCycle_ByLeaderboardCode_ByCycleId_v3(leaderboardCode, cycleId, { limit })
      : await leaderboardDataApi.getAlltime_ByLeaderboardCode_v3(leaderboardCode, { limit })

    return mapEntries(data.data)
  } catch (err) {
    // AGS returns 404 when a leaderboard has no ranking entries yet — treat as empty, not an error
    const status = (err as { status?: number })?.status
    if (status === 404) return []
    throw err
  }
}
