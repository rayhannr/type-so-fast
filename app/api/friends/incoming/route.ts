import { listIncomingFriendRequests } from '@/lib/ags/social'
import { getUserSummaries } from '@/lib/ags/displayName'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const requesterIds = await listIncomingFriendRequests(auth.accessToken)
    const incoming = await getUserSummaries(auth.accessToken, requesterIds)
    return Response.json(incoming)
  } catch (err) {
    return errorResponse(err, '[friends/incoming] GET failed')
  }
}
