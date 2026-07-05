import { UserStatisticApi } from '@accelbyte/sdk-social'
import { createSdk } from './sdk'

export const STAT_BEST_WPM = 'best-wpm'
export const STAT_GAMES_PLAYED = 'games-played'
export const STAT_TOTAL_WORDS_TYPED = 'total-words-typed'

export interface GameResultStats {
  wpm: number
  wordsTyped: number
  displayName: string
}

export interface PersonalStats {
  bestWpm: number
  gamesPlayed: number
  totalWordsTyped: number
}

export const submitGameStats = async (userId: string, accessToken: string, result: GameResultStats): Promise<void> => {
  const statisticApi = UserStatisticApi(createSdk(accessToken))

  await Promise.all([
    statisticApi.updateStatitemValue_ByUserId_ByStatCode_v2(userId, STAT_BEST_WPM, {
      updateStrategy: 'MAX',
      value: result.wpm,
      additionalData: { displayName: result.displayName },
    }),
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
