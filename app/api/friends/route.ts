import { listFriends, sendFriendRequest } from '@/lib/ags/social'
import { getUserSummaries } from '@/lib/ags/displayName'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const friendIds = await listFriends(auth.accessToken)
    const friends = await getUserSummaries(auth.accessToken, friendIds)
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
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[friends] POST failed')
  }
}
