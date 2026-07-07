import { UserAchievementsApi, AchievementsApi } from '@accelbyte/sdk-achievement'
import { createSdk } from './sdk'
import { WORD_MODES } from '@/lib/word-generators'
import { DURATIONS } from '@/components/DurationSelector'
import type { Difficulty } from '@/lib/botDifficulty'
import type { PvcData } from '@/lib/progress'

const ACHIEVEMENT_PERFECTIONIST = 'perfectionist'
const ACHIEVEMENT_MODE_EXPLORER = 'mode-explorer'
const ACHIEVEMENT_TIME_TRAVELER = 'time-traveler'
const ACHIEVEMENT_PVC_FLAWLESS = 'pvc-flawless'

const PVC_WIN_ACHIEVEMENTS: Record<Difficulty, string> = {
  easy: 'pvc-win-easy',
  medium: 'pvc-win-medium',
  hard: 'pvc-win-hard',
  legend: 'pvc-win-legend',
}

const PVC_STREAK_ACHIEVEMENTS: { code: string; streak: number }[] = [
  { code: 'pvc-streak-legend-3', streak: 3 },
  { code: 'pvc-streak-legend-5', streak: 5 },
]

const PVC_WIN_MILESTONES: { code: string; wins: number }[] = [
  { code: 'pvc-wins-10', wins: 10 },
  { code: 'pvc-wins-50', wins: 50 },
]

const PERFECT_STREAK_ACHIEVEMENTS: { code: string; games: number }[] = [
  { code: 'perfect-3', games: 3 },
  { code: 'perfect-10', games: 10 },
]

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
      userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, achievement.code).catch(() => { })
    )
  )
}

export const unlockPerfectStreakIfEligible = async (
  userId: string,
  accessToken: string,
  perfectStreak: number
): Promise<void> => {
  const eligible = PERFECT_STREAK_ACHIEVEMENTS.filter((achievement) => perfectStreak >= achievement.games)
  if (eligible.length === 0) return

  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  await Promise.all(
    eligible.map((achievement) =>
      userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, achievement.code).catch(() => { })
    )
  )
}

export const unlockVarietyIfEligible = async (
  userId: string,
  accessToken: string,
  modesPlayed: string[],
  durationsPlayed: number[]
): Promise<void> => {
  const eligible: string[] = []
  if (WORD_MODES.every((mode) => modesPlayed.includes(mode))) eligible.push(ACHIEVEMENT_MODE_EXPLORER)
  if (DURATIONS.every((duration) => durationsPlayed.includes(duration))) eligible.push(ACHIEVEMENT_TIME_TRAVELER)
  if (eligible.length === 0) return

  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  await Promise.all(
    eligible.map((code) => userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, code).catch(() => { }))
  )
}

export const unlockPvcAchievementsIfEligible = async (
  userId: string,
  accessToken: string,
  context: { difficulty: Difficulty; won: boolean; accuracy: number; pvcProgress: PvcData }
): Promise<void> => {
  if (!context.won) return

  const totalWins =
    context.pvcProgress.easyWins + context.pvcProgress.mediumWins + context.pvcProgress.hardWins + context.pvcProgress.legendWins
  const eligible: string[] = [PVC_WIN_ACHIEVEMENTS[context.difficulty]]
  if (context.accuracy >= 100) eligible.push(ACHIEVEMENT_PVC_FLAWLESS)
  PVC_STREAK_ACHIEVEMENTS.filter((a) => context.pvcProgress.legendWinStreak >= a.streak).forEach((a) => eligible.push(a.code))
  PVC_WIN_MILESTONES.filter((a) => totalWins >= a.wins).forEach((a) => eligible.push(a.code))

  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  await Promise.all(
    eligible.map((code) => userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, code).catch(() => {}))
  )
}

export interface AchievementInfo {
  code: string
  name: string
  description: string
  unlocked: boolean
}

export const getAchievementList = async (userId: string, accessToken: string): Promise<AchievementInfo[]> => {
  const sdk = createSdk(accessToken)
  const achievementsApi = AchievementsApi(sdk)
  const userAchievementsApi = UserAchievementsApi(sdk)

  const [{ data: catalog }, { data: userAchievements }] = await Promise.all([
    achievementsApi.getAchievements({ language: 'en', limit: 100 }),
    userAchievementsApi.getAchievements_ByUserId(userId, { limit: 100 }),
  ])

  const unlockedCodes = new Set(
    userAchievements.data.filter((item) => item.status === UNLOCKED_STATUS).map((item) => item.achievementCode)
  )

  return catalog.data
    .filter((achievement) => !achievement.hidden || unlockedCodes.has(achievement.achievementCode))
    .sort((a, b) => a.listOrder - b.listOrder)
    .map((achievement) => ({
      code: achievement.achievementCode,
      name: achievement.name,
      description: achievement.description,
      unlocked: unlockedCodes.has(achievement.achievementCode),
    }))
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
