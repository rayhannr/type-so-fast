import { lockRoom, setSessionAttributes } from '@/lib/ags/session'
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
    await lockRoom(auth.accessToken, sessionId)
    await setSessionAttributes(auth.accessToken, sessionId, { status: 'racing' })
    await trigger(`private-room-${sessionId}`, 'room:start', {})
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[rooms/:sessionId/start] POST failed')
  }
}
