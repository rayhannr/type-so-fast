import { getOrCreateProfile } from '@/lib/ags/profile'
import { getAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getOrCreateProfile(auth.accessToken)
    return Response.json(profile)
  } catch (err) {
    console.error('[profile] GET failed:', err)
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
