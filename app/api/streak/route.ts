import { getStreak, saveStreak } from '@/lib/ags/cloudsave'

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
    const streak = await getStreak(auth.userId, auth.accessToken)
    return Response.json(streak)
  } catch (err) {
    console.error('[streak] GET failed:', err)
    return Response.json({ error: 'Failed to fetch streak' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { streak } = await request.json()
    await saveStreak(auth.userId, auth.accessToken, streak)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[streak] PUT failed:', err)
    return Response.json({ error: 'Failed to save streak' }, { status: 500 })
  }
}
