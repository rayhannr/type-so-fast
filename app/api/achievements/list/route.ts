import { getAchievementList } from '@/lib/ags/achievements'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const achievements = await getAchievementList(auth.userId, auth.accessToken)
    return Response.json(achievements)
  } catch (err) {
    console.error('[achievements/list] GET failed:', err)
    return Response.json({ error: 'Failed to fetch achievement list' }, { status: 500 })
  }
}
