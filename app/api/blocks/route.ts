import { blockUser, listBlockedUsers } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const blocked = await listBlockedUsers(auth.accessToken)
    return Response.json(blocked)
  } catch (err) {
    console.error('[blocks] GET failed:', err)
    return Response.json({ error: 'Failed to fetch blocked users' }, { status: 500 })
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
    console.error('[blocks] POST failed:', err)
    return Response.json({ error: 'Failed to block user' }, { status: 500 })
  }
}
