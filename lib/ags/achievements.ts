import { UserAchievementsApi } from '@accelbyte/sdk-achievement'
import { createSdk } from './sdk'

export const ACHIEVEMENT_PERFECTIONIST = 'perfectionist'

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
