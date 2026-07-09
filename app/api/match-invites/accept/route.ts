import { createInviteSession } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { trigger } from '@/lib/pusher'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { inviterUserId } = await request.json()
    const session = await createInviteSession(auth.accessToken, inviterUserId, auth.userId)
    await trigger(`private-user-${inviterUserId}`, 'invite:accepted', { sessionId: session.id })
    return Response.json(session)
  } catch (err) {
    return errorResponse(err, '[match-invites/accept] POST failed')
  }
}
