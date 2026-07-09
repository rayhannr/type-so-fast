import { getBestRecords, saveBestRecords } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const records = await getBestRecords(auth.userId, auth.accessToken)
    return Response.json(records)
  } catch (err) {
    return errorResponse(err, '[records] GET failed')
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { records } = await request.json()
    await saveBestRecords(auth.userId, auth.accessToken, records)
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err, '[records] PUT failed')
  }
}
