import { getOrCreateDisplayName } from '@/lib/ags/displayName'

function getAuth(request: Request): { userId: string; accessToken: string } | null {
  const auth = request.headers.get('Authorization')
  const userId = request.headers.get('X-User-Id')
  if (!auth || !userId) return null
  return { userId, accessToken: auth.replace('Bearer ', '') }
}

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const localNameHint = searchParams.get('localName') ?? undefined
    const displayName = await getOrCreateDisplayName(auth.userId, auth.accessToken, localNameHint)
    return Response.json({ displayName })
  } catch (err) {
    console.error('[display-name] GET failed:', err)
    return Response.json({ error: 'Failed to fetch display name' }, { status: 500 })
  }
}
