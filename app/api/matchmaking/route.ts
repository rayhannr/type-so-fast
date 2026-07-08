import { createMatchTicket } from '@/lib/ags/matchmaking'
import { getAuth } from '@/lib/api-auth'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ticket = await createMatchTicket(auth.accessToken)
    return Response.json(ticket)
  } catch (err) {
    console.error('[matchmaking] POST failed:', err)
    return Response.json({ error: 'Failed to create match ticket' }, { status: 500 })
  }
}
