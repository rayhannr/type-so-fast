import { loginWithGoogle } from '@/lib/ags/auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()
    if (!idToken) {
      return Response.json({ error: 'idToken is required' }, { status: 400 })
    }
    const session = await loginWithGoogle(idToken)
    return Response.json(session)
  } catch (err) {
    return errorResponse(err, '[auth] loginWithGoogle failed')
  }
}
