import { getBestRecords, saveBestRecords } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const records = await getBestRecords(auth.userId, auth.accessToken)
    return Response.json(records)
  } catch (err) {
    console.error('[records] GET failed:', err)
    return Response.json({ error: 'Failed to fetch records' }, { status: 500 })
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
    console.error('[records] PUT failed:', err)
    return Response.json({ error: 'Failed to save records' }, { status: 500 })
  }
}
