import {
  diffNewlyUnlocked,
  getUnlockedAchievements,
  unlockPerfectionistIfEligible,
  unlockStreakAchievementsIfEligible,
} from '@/lib/ags/achievements'

function getAuth(request: Request): { userId: string; accessToken: string } | null {
  const auth = request.headers.get('Authorization')
  const userId = request.headers.get('X-User-Id')
  if (!auth || !userId) return null
  return { userId, accessToken: auth.replace('Bearer ', '') }
}

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const achievements = await getUnlockedAchievements(auth.userId, auth.accessToken)
    return Response.json(achievements)
  } catch (err) {
    console.error('[achievements] GET failed:', err)
    return Response.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { accuracy, previousCodes, streak } = await request.json()
    await unlockPerfectionistIfEligible(auth.userId, auth.accessToken, accuracy)
    await unlockStreakAchievementsIfEligible(auth.userId, auth.accessToken, streak ?? 0)
    const newlyUnlocked = await diffNewlyUnlocked(auth.userId, auth.accessToken, previousCodes ?? [])
    return Response.json(newlyUnlocked)
  } catch (err) {
    console.error('[achievements] POST failed:', err)
    return Response.json({ error: 'Failed to process achievements' }, { status: 500 })
  }
}
