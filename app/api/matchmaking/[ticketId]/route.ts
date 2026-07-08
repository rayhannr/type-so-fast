import { cancelMatchTicket, getMatchTicketStatus } from '@/lib/ags/matchmaking'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { ticketId } = await params
    const status = await getMatchTicketStatus(auth.accessToken, ticketId)
    return Response.json(status)
  } catch (err) {
    console.error('[matchmaking/:ticketId] GET failed:', err)
    return Response.json({ error: 'Failed to fetch match ticket status' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { ticketId } = await params
    await cancelMatchTicket(auth.accessToken, ticketId)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[matchmaking/:ticketId] DELETE failed:', err)
    return Response.json({ error: 'Failed to cancel match ticket' }, { status: 500 })
  }
}
