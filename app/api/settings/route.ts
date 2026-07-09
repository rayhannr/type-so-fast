import { getSettings, saveSettings } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const settings = await getSettings(auth.userId, auth.accessToken)
    return Response.json(settings)
  } catch (err) {
    return errorResponse(err, '[settings] GET failed')
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
    return errorResponse(err, '[settings] PUT failed')
  }
}
