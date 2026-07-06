import { getProgression, saveProgression } from '@/lib/ags/cloudsave'

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
    const progression = await getProgression(auth.userId, auth.accessToken)
    return Response.json(progression)
  } catch (err) {
    console.error('[progression] GET failed:', err)
    return Response.json({ error: 'Failed to fetch progression' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { progression } = await request.json()
    await saveProgression(auth.userId, auth.accessToken, progression)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[progression] PUT failed:', err)
    return Response.json({ error: 'Failed to save progression' }, { status: 500 })
  }
}
