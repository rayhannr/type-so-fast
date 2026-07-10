import { getOrCreateDisplayName, updateDisplayName } from '@/lib/ags/displayName'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const localNameHint = searchParams.get('localName') ?? undefined
    const displayName = await getOrCreateDisplayName(auth.accessToken, localNameHint)
    return Response.json({ displayName })
  } catch (err) {
    return errorResponse(err, '[display-name] GET failed')
  }
}

export async function PATCH(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { displayName } = await request.json()
    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      return Response.json({ error: 'displayName is required' }, { status: 400 })
    }

    const updated = await updateDisplayName(auth.accessToken, displayName.trim())
    return Response.json({ displayName: updated })
  } catch (err) {
    return errorResponse(err, '[display-name] PATCH failed')
  }
}
