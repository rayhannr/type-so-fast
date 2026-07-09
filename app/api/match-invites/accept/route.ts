import { createInviteSession } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { trigger } from '@/lib/pusher'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { inviterUserId } = await request.json()
    const session = await createInviteSession(auth.accessToken, inviterUserId, auth.userId)
    await trigger(`private-user-${inviterUserId}`, 'invite:accepted', { sessionId: session.id })
    return Response.json(session)
  } catch (err) {
    console.error('[match-invites/accept] POST failed:', err)
    return Response.json({ error: 'Failed to accept match invite' }, { status: 500 })
  }
}
