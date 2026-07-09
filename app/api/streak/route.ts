import { getStreak, saveStreak } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const streak = await getStreak(auth.userId, auth.accessToken)
    return Response.json(streak)
  } catch (err) {
    return errorResponse(err, '[streak] GET failed')
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { streak } = await request.json()
    await saveStreak(auth.userId, auth.accessToken, streak)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[streak] PUT failed')
  }
}
