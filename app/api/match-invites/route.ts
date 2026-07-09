import { getAuth } from '@/lib/api-auth'
import { trigger } from '@/lib/pusher'
import { errorResponse } from '@/lib/api-error'

// No server-side invite record: delivery is purely the live Pusher event on the invitee's
// private channel. If the invitee isn't connected when this fires, the invite is simply missed —
// there is no fallback poll (see docs/ags-plans/2026-07-08-friends-match-invite.md task 7c note).
export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { inviteeUserId } = await request.json()
    await trigger(`private-user-${inviteeUserId}`, 'invite:new', { inviterUserId: auth.userId })
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[match-invites] POST failed')
  }
}
