import { getSession, leaveSession, setSessionAttributes } from '@/lib/ags/session'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const session = await getSession(auth.accessToken, id)
    return Response.json(session)
  } catch (err) {
    console.error('[session/:id] GET failed:', err)
    return Response.json({ error: 'Failed to fetch session' }, { status: 500 })
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
    console.error('[session/:id] PATCH failed:', err)
    return Response.json({ error: 'Failed to update session attributes' }, { status: 500 })
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
    console.error('[session/:id] DELETE failed:', err)
    return Response.json({ error: 'Failed to leave session' }, { status: 500 })
  }
}
