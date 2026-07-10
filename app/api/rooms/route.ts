import { createRoomSession, generateRoomCode } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const room = await createRoomSession(auth.accessToken)
    const code = await generateRoomCode(auth.accessToken, room.id)
    return Response.json({ ...room, code })
  } catch (err) {
    return errorResponse(err, '[rooms] POST failed')
  }
}
