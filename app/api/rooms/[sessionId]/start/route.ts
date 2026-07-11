import { lockRoom } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'
import { trigger } from '@/lib/pusher'

// No host check here: AGS itself rejects a non-leader lockRoom call with 403 LeadershipRequired
// (generate-code/revoke-code are leader-enforced server-side), so errorResponse surfaces that as-is.
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId } = await params
    // the race setup rides in the room:start payload — joiners can't rely on the 2s attributes
    // poll having delivered the words by start time (the caller writes those after, as fallback)
    const { words, duration, mode } = await request.json()
    // best-effort: a room left joinable mid-race beats a match that never starts, since every
    // client (host included) starts on the room:start broadcast
    try {
      await lockRoom(auth.accessToken, sessionId)
    } catch (err) {
      console.error(`[rooms/${sessionId}/start] lockRoom failed — starting unlocked:`, err)
    }
    await trigger(`private-room-${sessionId}`, 'room:start', { words, duration, mode })
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[rooms/:sessionId/start] POST failed')
  }
}
