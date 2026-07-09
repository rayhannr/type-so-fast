import { getPvcProgress, savePvcProgress } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pvc = await getPvcProgress(auth.userId, auth.accessToken)
    return Response.json(pvc)
  } catch (err) {
    return errorResponse(err, '[pvc-progress] GET failed')
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { pvc } = await request.json()
    await savePvcProgress(auth.userId, auth.accessToken, pvc)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[pvc-progress] PUT failed')
  }
}
