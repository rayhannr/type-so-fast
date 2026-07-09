import { cancelMatchTicket, getMatchTicketStatus } from '@/lib/ags/matchmaking'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { ticketId } = await params
    const status = await getMatchTicketStatus(auth.accessToken, ticketId)
    return Response.json(status)
  } catch (err) {
    return errorResponse(err, '[matchmaking/:ticketId] GET failed')
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
    return errorResponse(err, '[matchmaking/:ticketId] DELETE failed')
  }
}
