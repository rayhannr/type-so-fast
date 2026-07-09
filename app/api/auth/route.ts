import { loginWithDeviceId } from '@/lib/ags/auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json()
    if (!deviceId) {
      return Response.json({ error: 'deviceId is required' }, { status: 400 })
    }
    const session = await loginWithDeviceId(deviceId)
    return Response.json(session)
  } catch (err) {
    return errorResponse(err, '[auth] loginWithDeviceId failed')
  }
}
