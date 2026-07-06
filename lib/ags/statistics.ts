import { UserStatisticApi } from '@accelbyte/sdk-social'
import { createSdk } from './sdk'
import type { Duration } from '@/components/DurationSelector'
import type { WordMode } from '@/lib/word-generators'

export const STAT_BEST_WPM = 'best-wpm'
export const STAT_GAMES_PLAYED = 'games-played'
export const STAT_TOTAL_WORDS_TYPED = 'total-words-typed'

export const STAT_BEST_WPM_BY_DURATION: Record<Duration, string> = {
  15: 'best-wpm-15s',
  30: 'best-wpm-30s',
  60: 'best-wpm-60s',
  120: 'best-wpm-120s',
}

// 'words' reuses the base best-wpm stat since it's the default mode
export const STAT_BEST_WPM_BY_MODE: Record<WordMode, string> = {
  words: 'best-wpm',
  numbers: 'best-wpm-numbers',
  punctuation: 'best-wpm-punctuation',
  quotes: 'best-wpm-quotes',
}

export interface GameResultStats {
  wpm: number
  wordsTyped: number
  displayName: string
  duration: Duration
  mode: WordMode
}

export interface PersonalStats {
  bestWpm: number
  gamesPlayed: number
  totalWordsTyped: number
}

export const submitGameStats = async (userId: string, accessToken: string, result: GameResultStats): Promise<void> => {
  const statisticApi = UserStatisticApi(createSdk(accessToken))

  const modeStatCode = STAT_BEST_WPM_BY_MODE[result.mode]
  const durationStatCode = STAT_BEST_WPM_BY_DURATION[result.duration]

  const updates = new Map<string, number>([
    [STAT_BEST_WPM, result.wpm],
    [durationStatCode, result.wpm],
  ])
  if (modeStatCode !== STAT_BEST_WPM) updates.set(modeStatCode, result.wpm)

  await Promise.all([
    ...[...updates].map(([statCode, value]) =>
      statisticApi.updateStatitemValue_ByUserId_ByStatCode_v2(userId, statCode, {
        updateStrategy: 'MAX',
        value,
        additionalData: { displayName: result.displayName },
      })
    ),
    statisticApi.updateStatitemValue_ByUserId_ByStatCode_v2(userId, STAT_GAMES_PLAYED, {
      updateStrategy: 'INCREMENT',
      value: 1,
    }),
    statisticApi.updateStatitemValue_ByUserId_ByStatCode_v2(userId, STAT_TOTAL_WORDS_TYPED, {
      updateStrategy: 'INCREMENT',
      value: result.wordsTyped,
    }),
  ])
}

export const getPersonalStats = async (userId: string, accessToken: string): Promise<PersonalStats> => {
  const statisticApi = UserStatisticApi(createSdk(accessToken))
  const { data } = await statisticApi.getStatitemsValueBulk_ByUserId(userId, {
    statCodes: [STAT_BEST_WPM, STAT_GAMES_PLAYED, STAT_TOTAL_WORDS_TYPED],
  })

  const valueOf = (statCode: string) => data.find((item) => item.statCode === statCode)?.value ?? 0

  return {
    bestWpm: valueOf(STAT_BEST_WPM),
    gamesPlayed: valueOf(STAT_GAMES_PLAYED),
    totalWordsTyped: valueOf(STAT_TOTAL_WORDS_TYPED),
  }
}
