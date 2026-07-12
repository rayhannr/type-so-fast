import {
  diffNewlyUnlocked,
  getUnlockedAchievements,
  unlockPerfectionistIfEligible,
  unlockPerfectStreakIfEligible,
  unlockPvcAchievementsIfEligible,
  unlockPvpAchievementsIfEligible,
  unlockRoomAchievementsIfEligible,
  unlockStreakAchievementsIfEligible,
  unlockVarietyIfEligible
} from '@/lib/ags/achievements'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const achievements = await getUnlockedAchievements(auth.userId, auth.accessToken)
    return Response.json(achievements)
  } catch (err) {
    return errorResponse(err, '[achievements] GET failed')
  }
}

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { accuracy, previousCodes, streak, perfectStreak, modesPlayed, durationsPlayed, pvc, pvp, room } = await request.json()
    await unlockPerfectionistIfEligible(auth.userId, auth.accessToken, accuracy)
    await unlockStreakAchievementsIfEligible(auth.userId, auth.accessToken, streak ?? 0)
    await unlockPerfectStreakIfEligible(auth.userId, auth.accessToken, perfectStreak ?? 0)
    await unlockVarietyIfEligible(auth.userId, auth.accessToken, modesPlayed ?? [], durationsPlayed ?? [])
    if (pvc) {
      await unlockPvcAchievementsIfEligible(auth.userId, auth.accessToken, {
        difficulty: pvc.difficulty,
        won: pvc.won,
        accuracy,
        pvcProgress: pvc.pvcProgress
      })
    }
    if (pvp) {
      await unlockPvpAchievementsIfEligible(auth.userId, auth.accessToken, {
        outcome: pvp.outcome,
        accuracy,
        pvpProgress: pvp.pvpProgress
      })
    }
    if (room) {
      await unlockRoomAchievementsIfEligible(auth.userId, auth.accessToken, {
        won: room.won,
        fullHouse: room.fullHouse,
        roomProgress: room.roomProgress
      })
    }
    const newlyUnlocked = await diffNewlyUnlocked(auth.userId, auth.accessToken, previousCodes ?? [])
    return Response.json(newlyUnlocked)
  } catch (err) {
    return errorResponse(err, '[achievements] POST failed')
  }
}
