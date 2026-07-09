import { getOrCreateDisplayName } from '@/lib/ags/displayName'
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
