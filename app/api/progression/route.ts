import { getProgression, saveProgression } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const progression = await getProgression(auth.userId, auth.accessToken)
    return Response.json(progression)
  } catch (err) {
    return errorResponse(err, '[progression] GET failed')
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
    return errorResponse(err, '[progression] PUT failed')
  }
}
