import { loginWithDeviceId } from '@/lib/ags/auth'

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json()
    if (!deviceId) {
      return Response.json({ error: 'deviceId is required' }, { status: 400 })
    }
    const session = await loginWithDeviceId(deviceId)
    return Response.json(session)
  } catch (err) {
    console.error('[auth] loginWithDeviceId failed:', err)
    return Response.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
