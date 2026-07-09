import { getAuth } from '@/lib/api-auth'
import { trigger } from '@/lib/pusher'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { inviterUserId } = await request.json()
    await trigger(`private-user-${inviterUserId}`, 'invite:declined', { inviteeUserId: auth.userId })
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[match-invites/decline] POST failed')
  }
}
