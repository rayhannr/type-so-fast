import { getSettings, saveSettings } from '@/lib/ags/cloudsave'

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
    const settings = await getSettings(auth.userId, auth.accessToken)
    return Response.json(settings)
  } catch (err) {
    console.error('[settings] GET failed:', err)
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { settings } = await request.json()
    await saveSettings(auth.userId, auth.accessToken, settings)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[settings] PUT failed:', err)
    return Response.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
