import {
  getTopLeaderboard,
  getDurationLeaderboardCode,
  getModeLeaderboardCode,
  LEADERBOARD_CODE,
  WEEKLY_CYCLE_ID,
} from '@/lib/ags/leaderboard'
import type { LeaderboardRange } from '@/lib/ags/leaderboard'
import { DURATIONS } from '@/components/DurationSelector'
import type { Duration } from '@/components/DurationSelector'
import { WORD_MODES } from '@/lib/word-generators'
import type { WordMode } from '@/lib/word-generators'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') ?? '10')

    const durationParam = Number(searchParams.get('duration'))
    const modeParam = searchParams.get('mode')
    const rangeParam = searchParams.get('range')

    const duration = (DURATIONS as readonly number[]).includes(durationParam) ? (durationParam as Duration) : null
    const mode: WordMode = (WORD_MODES as string[]).includes(modeParam ?? '') ? (modeParam as WordMode) : 'words'
    const range: LeaderboardRange = rangeParam === 'weekly' ? 'weekly' : 'alltime'

    let leaderboardCode = LEADERBOARD_CODE
    let cycleId: string | undefined

    if (duration) {
      leaderboardCode = getDurationLeaderboardCode(duration)
    } else {
      leaderboardCode = getModeLeaderboardCode(mode, range)
      cycleId = range === 'weekly' ? WEEKLY_CYCLE_ID : undefined
    }

    const entries = await getTopLeaderboard(limit, leaderboardCode, cycleId)
    return Response.json(entries)
  } catch (err) {
    console.error('[leaderboard] GET failed:', err)
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
