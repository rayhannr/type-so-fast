import { UserAchievementsApi } from '@accelbyte/sdk-achievement'
import { createSdk } from './sdk'

export const ACHIEVEMENT_PERFECTIONIST = 'perfectionist'

const STREAK_ACHIEVEMENTS: { code: string; days: number }[] = [
  { code: 'streak-7', days: 7 },
  { code: 'streak-30', days: 30 },
  { code: 'streak-100', days: 100 },
  { code: 'streak-250', days: 250 },
  { code: 'streak-365', days: 365 },
  { code: 'streak-500', days: 500 },
  { code: 'streak-750', days: 750 },
  { code: 'streak-1000', days: 1000 },
]

const UNLOCKED_STATUS = 2

export interface UnlockedAchievement {
  achievementCode: string
  name: string
}

const toUnlocked = (items: { achievementCode: string; status: number; name: Record<string, string> }[]) =>
  items
    .filter((item) => item.status === UNLOCKED_STATUS)
    .map((item) => ({ achievementCode: item.achievementCode, name: item.name.en ?? item.achievementCode }))

export const getUnlockedAchievements = async (userId: string, accessToken: string): Promise<UnlockedAchievement[]> => {
  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  const { data } = await userAchievementsApi.getAchievements_ByUserId(userId, { preferUnlocked: true, limit: 100 })
  return toUnlocked(data.data)
}

export const unlockPerfectionistIfEligible = async (userId: string, accessToken: string, accuracy: number): Promise<void> => {
  if (accuracy < 100) return
  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  await userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, ACHIEVEMENT_PERFECTIONIST)
}

export const unlockStreakAchievementsIfEligible = async (
  userId: string,
  accessToken: string,
  streak: number
): Promise<void> => {
  const eligible = STREAK_ACHIEVEMENTS.filter((achievement) => streak >= achievement.days)
  if (eligible.length === 0) return

  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  await Promise.all(
    eligible.map((achievement) =>
      // one milestone failing shouldn't block the others from unlocking
      userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, achievement.code).catch(() => {})
    )
  )
}

export const diffNewlyUnlocked = async (
  userId: string,
  accessToken: string,
  previousCodes: string[]
): Promise<UnlockedAchievement[]> => {
  const previouslyUnlocked = new Set(previousCodes)
  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  const { data } = await userAchievementsApi.getAchievements_ByUserId(userId, { preferUnlocked: true, limit: 100 })
  return toUnlocked(data.data).filter((item) => !previouslyUnlocked.has(item.achievementCode))
}
