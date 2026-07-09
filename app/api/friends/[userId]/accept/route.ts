import { acceptFriendRequest } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await params
    await acceptFriendRequest(auth.accessToken, userId)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[friends/:userId/accept] POST failed:', err)
    return Response.json({ error: 'Failed to accept friend request' }, { status: 500 })
  }
}
