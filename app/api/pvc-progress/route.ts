import { getPvcProgress, savePvcProgress } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pvc = await getPvcProgress(auth.userId, auth.accessToken)
    return Response.json(pvc)
  } catch (err) {
    console.error('[pvc-progress] GET failed:', err)
    return Response.json({ error: 'Failed to fetch pvc progress' }, { status: 500 })
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
    console.error('[pvc-progress] PUT failed:', err)
    return Response.json({ error: 'Failed to save pvc progress' }, { status: 500 })
  }
}
