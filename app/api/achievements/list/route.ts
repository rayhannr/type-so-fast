import { getAchievementList } from '@/lib/ags/achievements'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const achievements = await getAchievementList(auth.userId, auth.accessToken)
    return Response.json(achievements)
  } catch (err) {
    return errorResponse(err, '[achievements/list] GET failed')
  }
}
