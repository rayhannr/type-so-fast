import { removeFriend } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await params
    await removeFriend(auth.accessToken, userId)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[friends/:userId] DELETE failed:', err)
    return Response.json({ error: 'Failed to remove friend' }, { status: 500 })
  }
}
