import { getUserSummaries } from '@/lib/ags/displayName'
import { blockUser, listBlockedUsers } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const blockedIds = await listBlockedUsers(auth.accessToken)
    const blocked = await getUserSummaries(blockedIds)
    return Response.json(blocked)
  } catch (err) {
    return errorResponse(err, '[blocks] GET failed')
  }
}

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await request.json()
    await blockUser(auth.accessToken, userId)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[blocks] POST failed')
  }
}
