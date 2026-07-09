import { createMatchTicket } from '@/lib/ags/matchmaking'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ticket = await createMatchTicket(auth.accessToken)
    return Response.json(ticket)
  } catch (err) {
    return errorResponse(err, '[matchmaking] POST failed')
  }
}
