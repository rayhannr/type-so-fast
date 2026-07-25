import { unlinkGoogleAccount } from '@/lib/ags/auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const { userId, accessToken } = await request.json()
    if (!userId || !accessToken) {
      return Response.json({ error: 'userId and accessToken are required' }, { status: 400 })
    }
    await unlinkGoogleAccount({ userId, accessToken })
    return Response.json({ unlinked: true })
  } catch (err) {
    return errorResponse(err, '[auth] unlinkGoogleAccount failed')
  }
}
