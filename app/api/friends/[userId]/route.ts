import { removeFriend } from '@/lib/ags/social'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await params
    await removeFriend(auth.accessToken, userId)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[friends/:userId] DELETE failed')
  }
}
