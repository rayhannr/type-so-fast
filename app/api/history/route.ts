import { getGameHistory, saveGameHistory } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const entries = await getGameHistory(auth.userId, auth.accessToken)
    return Response.json(entries)
  } catch (err) {
    return errorResponse(err, '[history] GET failed')
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { entries } = await request.json()
    await saveGameHistory(auth.userId, auth.accessToken, entries)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[history] PUT failed')
  }
}
