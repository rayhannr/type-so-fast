import { getGameHistory, saveGameHistory } from '@/lib/ags/cloudsave'

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
    const entries = await getGameHistory(auth.userId, auth.accessToken)
    return Response.json(entries)
  } catch (err) {
    console.error('[history] GET failed:', err)
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { entries } = await request.json()
    await saveGameHistory(auth.userId, auth.accessToken, entries)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[history] PUT failed:', err)
    return Response.json({ error: 'Failed to save history' }, { status: 500 })
  }
}
