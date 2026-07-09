import { getOrCreateProfile } from '@/lib/ags/profile'
import { getAuth } from '@/lib/api-auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getOrCreateProfile(auth.accessToken)
    return Response.json(profile)
  } catch (err) {
    return errorResponse(err, '[profile] GET failed')
  }
}
