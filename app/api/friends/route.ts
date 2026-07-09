import { listFriends, sendFriendRequest } from '@/lib/ags/social'
import { getUserSummaries } from '@/lib/ags/displayName'
import { getUserIdByPublicId } from '@/lib/ags/profile'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'
import { trigger } from '@/lib/pusher'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const friendIds = await listFriends(auth.accessToken)
    const friends = await getUserSummaries(friendIds)
    return Response.json(friends)
  } catch (err) {
    return errorResponse(err, '[friends] GET failed')
  }
}

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { publicId } = await request.json()
    await sendFriendRequest(auth.accessToken, publicId)

    const friendUserId = await getUserIdByPublicId(auth.accessToken, publicId)
    if (friendUserId) await trigger(`private-user-${friendUserId}`, 'friend:request', {})

    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[friends] POST failed')
  }
}
