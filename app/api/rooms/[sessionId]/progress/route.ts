import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'
import { trigger } from '@/lib/pusher'

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId } = await params
    const { wpm, progress } = await request.json()
    // userId is taken from auth, not the request body, so a player can't spoof another player's progress.
    await trigger(`private-room-${sessionId}`, 'room:progress', { userId: auth.userId, wpm, progress })
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[rooms/:sessionId/progress] POST failed')
  }
}
