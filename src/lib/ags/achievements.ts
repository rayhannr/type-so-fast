import { UserAchievementsApi } from '@accelbyte/sdk-achievement'
import { sdk } from './sdk'

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

export const getUnlockedAchievementCodes = async (userId: string): Promise<Set<string>> => {
  const userAchievementsApi = UserAchievementsApi(sdk)
  const { data } = await userAchievementsApi.getAchievements_ByUserId(userId, { preferUnlocked: true, limit: 100 })
  return new Set(toUnlocked(data.data).map((item) => item.achievementCode))
}

export const unlockPerfectionistIfEligible = async (userId: string, accuracy: number): Promise<void> => {
  if (accuracy < 100) return
  const userAchievementsApi = UserAchievementsApi(sdk)
  await userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, ACHIEVEMENT_PERFECTIONIST)
}

export const diffNewlyUnlocked = async (
  userId: string,
  previouslyUnlocked: Set<string>
): Promise<UnlockedAchievement[]> => {
  const userAchievementsApi = UserAchievementsApi(sdk)
  const { data } = await userAchievementsApi.getAchievements_ByUserId(userId, { preferUnlocked: true, limit: 100 })
  return toUnlocked(data.data).filter((item) => !previouslyUnlocked.has(item.achievementCode))
}
