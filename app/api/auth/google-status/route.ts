import { getLinkedGoogleAccount } from '@/lib/ags/auth'
import { errorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id')
    const authorization = request.headers.get('Authorization')
    if (!userId || !authorization) {
      return Response.json({ error: 'session headers are required' }, { status: 400 })
    }
    const accessToken = authorization.replace('Bearer ', '')
    const linked = await getLinkedGoogleAccount({ userId, accessToken })
    return Response.json(linked)
  } catch (err) {
    return errorResponse(err, '[auth] getLinkedGoogleAccount failed')
  }
}
