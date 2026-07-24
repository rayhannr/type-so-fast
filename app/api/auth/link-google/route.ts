import { linkGoogleAccount } from '@/lib/ags/auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const { userId, accessToken, idToken } = await request.json()
    if (!userId || !accessToken || !idToken) {
      return Response.json({ error: 'userId, accessToken, and idToken are required' }, { status: 400 })
    }
    await linkGoogleAccount({ userId, accessToken }, idToken)
    return Response.json({ linked: true })
  } catch (err) {
    return errorResponse(err, '[auth] linkGoogleAccount failed')
  }
}
