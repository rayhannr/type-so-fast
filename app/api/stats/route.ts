import { getPersonalStats, submitGameStats } from '@/lib/ags/statistics'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const stats = await getPersonalStats(auth.userId, auth.accessToken)
    return Response.json(stats)
  } catch (err) {
    return errorResponse(err, '[stats] GET failed')
  }
}

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await request.json()
    await submitGameStats(auth.userId, auth.accessToken, result)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[stats] POST failed')
  }
}
