import { joinRoomByCode } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'
import { trigger } from '@/lib/pusher'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { code } = await request.json()
    const room = await joinRoomByCode(auth.accessToken, code)
    await trigger(`private-room-${room.id}`, 'room:joined', { userId: auth.userId })
    return Response.json(room)
  } catch (err) {
    return errorResponse(err, '[rooms/join] POST failed')
  }
}
