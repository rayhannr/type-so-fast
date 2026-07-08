import { getPvpProgress, savePvpProgress } from '@/lib/ags/cloudsave'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pvp = await getPvpProgress(auth.userId, auth.accessToken)
    return Response.json(pvp)
  } catch (err) {
    console.error('[pvp-progress] GET failed:', err)
    return Response.json({ error: 'Failed to fetch pvp progress' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { pvp } = await request.json()
    await savePvpProgress(auth.userId, auth.accessToken, pvp)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[pvp-progress] PUT failed:', err)
    return Response.json({ error: 'Failed to save pvp progress' }, { status: 500 })
  }
}
