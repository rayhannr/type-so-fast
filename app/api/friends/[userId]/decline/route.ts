import { declineFriendRequest } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await params
    await declineFriendRequest(auth.accessToken, userId)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[friends/:userId/decline] POST failed')
  }
}
