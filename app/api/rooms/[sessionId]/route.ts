import { getUserSummaries } from '@/lib/ags/displayName'
import { getRoomSession } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { sessionId } = await params
    const room = await getRoomSession(auth.accessToken, sessionId)
    const memberNames = await getUserSummaries(room.members.map(m => m.userID))
    return Response.json({ ...room, memberNames })
  } catch (err) {
    return errorResponse(err, '[rooms/:sessionId] GET failed')
  }
}
