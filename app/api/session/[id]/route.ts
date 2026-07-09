import { getSession, leaveSession, setSessionAttributes } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const session = await getSession(auth.accessToken, id)
    return Response.json(session)
  } catch (err) {
    return errorResponse(err, '[session/:id] GET failed')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { attributes } = await request.json()
    await setSessionAttributes(auth.accessToken, id, attributes)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[session/:id] PATCH failed')
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await leaveSession(auth.accessToken, id)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[session/:id] DELETE failed')
  }
}
