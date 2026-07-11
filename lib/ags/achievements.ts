import { UserAchievementsApi, AchievementsApi } from '@accelbyte/sdk-achievement'
import { createSdk } from './sdk'
import { WORD_MODES } from '@/lib/word-generators'
import { DURATIONS } from '@/components/DurationSelector'
import { Difficulty } from '@/lib/botDifficulty'
import { PvcData, PvpData, RoomData } from '@/lib/progress'

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

const ACHIEVEMENT_PVP_WIN = 'pvp-win'
const ACHIEVEMENT_PVP_FLAWLESS = 'pvp-flawless'

const PVP_STREAK_ACHIEVEMENTS: { code: string; streak: number }[] = [
  { code: 'pvp-streak-3', streak: 3 },
  { code: 'pvp-streak-5', streak: 5 },
]

const PVP_WIN_MILESTONES: { code: string; wins: number }[] = [
  { code: 'pvp-wins-10', wins: 10 },
  { code: 'pvp-wins-50', wins: 50 },
]

const ACHIEVEMENT_ROOM_WIN = 'room-win'
const ACHIEVEMENT_ROOM_FULL_HOUSE = 'room-full-house'

const ROOM_STREAK_ACHIEVEMENTS: { code: string; streak: number }[] = [
  { code: 'room-streak-3', streak: 3 },
  { code: 'room-streak-5', streak: 5 },
]

const ROOM_WIN_MILESTONES: { code: string; wins: number }[] = [{ code: 'room-wins-10', wins: 10 }]

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

// unlocks each code for the user; one code failing shouldn't block the others from unlocking
const unlockCodes = async (userId: string, accessToken: string, codes: string[]): Promise<void> => {
  if (codes.length === 0) return
  const sdk = createSdk(accessToken)
  const userAchievementsApi = UserAchievementsApi(sdk)
  await Promise.all(codes.map((code) => userAchievementsApi.updateUnlock_ByUserId_ByAchievementCode(userId, code).catch(() => {})))
}

export const unlockPerfectionistIfEligible = async (userId: string, accessToken: string, accuracy: number): Promise<void> => {
  if (accuracy < 100) return
  await unlockCodes(userId, accessToken, [ACHIEVEMENT_PERFECTIONIST])
}

export const unlockStreakAchievementsIfEligible = async (
  userId: string,
  accessToken: string,
  streak: number
): Promise<void> => {
  const eligible = STREAK_ACHIEVEMENTS.filter((achievement) => streak >= achievement.days).map((achievement) => achievement.code)
  await unlockCodes(userId, accessToken, eligible)
}

export const unlockPerfectStreakIfEligible = async (
  userId: string,
  accessToken: string,
  perfectStreak: number
): Promise<void> => {
  const eligible = PERFECT_STREAK_ACHIEVEMENTS.filter((achievement) => perfectStreak >= achievement.games).map(
    (achievement) => achievement.code
  )
  await unlockCodes(userId, accessToken, eligible)
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
  await unlockCodes(userId, accessToken, eligible)
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

  await unlockCodes(userId, accessToken, eligible)
}

export const unlockPvpAchievementsIfEligible = async (
  userId: string,
  accessToken: string,
  context: { outcome: 'win' | 'lose' | 'tie'; accuracy: number; pvpProgress: PvpData }
): Promise<void> => {
  if (context.outcome !== 'win') return

  const eligible: string[] = [ACHIEVEMENT_PVP_WIN]
  if (context.accuracy >= 100) eligible.push(ACHIEVEMENT_PVP_FLAWLESS)
  PVP_STREAK_ACHIEVEMENTS.filter((a) => context.pvpProgress.winStreak >= a.streak).forEach((a) => eligible.push(a.code))
  PVP_WIN_MILESTONES.filter((a) => context.pvpProgress.wins >= a.wins).forEach((a) => eligible.push(a.code))

  await unlockCodes(userId, accessToken, eligible)
}

export const unlockRoomAchievementsIfEligible = async (
  userId: string,
  accessToken: string,
  context: { won: boolean; fullHouse: boolean; roomProgress: RoomData }
): Promise<void> => {
  if (!context.won) return

  const eligible: string[] = [ACHIEVEMENT_ROOM_WIN]
  if (context.fullHouse) eligible.push(ACHIEVEMENT_ROOM_FULL_HOUSE)
  ROOM_STREAK_ACHIEVEMENTS.filter((a) => context.roomProgress.winStreak >= a.streak).forEach((a) => eligible.push(a.code))
  ROOM_WIN_MILESTONES.filter((a) => context.roomProgress.wins >= a.wins).forEach((a) => eligible.push(a.code))

  await unlockCodes(userId, accessToken, eligible)
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
  const unlocked = await getUnlockedAchievements(userId, accessToken)
  return unlocked.filter((item) => !previouslyUnlocked.has(item.achievementCode))
}
