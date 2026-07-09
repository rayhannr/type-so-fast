import { listFriends, sendFriendRequest } from '@/lib/ags/social'
import { getUserSummaries } from '@/lib/ags/displayName'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const friendIds = await listFriends(auth.accessToken)
    const friends = await getUserSummaries(auth.accessToken, friendIds)
    return Response.json(friends)
  } catch (err) {
    console.error('[friends] GET failed:', err)
    return Response.json({ error: 'Failed to fetch friends' }, { status: 500 })
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
    console.error('[friends] POST failed:', err)
    return Response.json({ error: 'Failed to send friend request' }, { status: 500 })
  }
}
