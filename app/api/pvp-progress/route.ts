import { getPvpProgress, savePvpProgress } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pvp = await getPvpProgress(auth.userId, auth.accessToken)
    return Response.json(pvp)
  } catch (err) {
    return errorResponse(err, '[pvp-progress] GET failed')
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { pvp } = await request.json()
    await savePvpProgress(auth.userId, auth.accessToken, pvp)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[pvp-progress] PUT failed')
  }
}
