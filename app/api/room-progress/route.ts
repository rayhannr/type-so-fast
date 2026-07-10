import { getRoomProgress, saveRoomProgress } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const room = await getRoomProgress(auth.userId, auth.accessToken)
    return Response.json(room)
  } catch (err) {
    return errorResponse(err, '[room-progress] GET failed')
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { room } = await request.json()
    await saveRoomProgress(auth.userId, auth.accessToken, room)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[room-progress] PUT failed')
  }
}
