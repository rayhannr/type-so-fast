import { getOrCreateDisplayName } from '@/lib/ags/displayName'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const localNameHint = searchParams.get('localName') ?? undefined
    const displayName = await getOrCreateDisplayName(auth.accessToken, localNameHint)
    return Response.json({ displayName })
  } catch (err) {
    console.error('[display-name] GET failed:', err)
    return Response.json({ error: 'Failed to fetch display name' }, { status: 500 })
  }
}
