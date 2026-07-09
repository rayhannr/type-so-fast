import { listIncomingFriendRequests } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const incoming = await listIncomingFriendRequests(auth.accessToken)
    return Response.json(incoming)
  } catch (err) {
    console.error('[friends/incoming] GET failed:', err)
    return Response.json({ error: 'Failed to fetch incoming friend requests' }, { status: 500 })
  }
}
