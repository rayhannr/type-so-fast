import { getAuth } from '@/lib/api-auth'
import { authenticate } from '@/lib/pusher'

const PRESENCE_CHANNEL = 'presence-online-users'

export async function POST(request: Request) {
  const auth = getAuth(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const socketId = form.get('socket_id')
  const channelName = form.get('channel_name')
  if (typeof socketId !== 'string' || typeof channelName !== 'string') {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // private-user-{userId} may only ever be authorized for the matching userId — this is what
  // keeps one player from subscribing to another's invite notifications.
  if (channelName.startsWith('private-user-')) {
    const ownerId = channelName.slice('private-user-'.length)
    if (ownerId !== auth.userId) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const response = authenticate(socketId, channelName)
    return Response.json(response)
  }

  if (channelName === PRESENCE_CHANNEL) {
    const response = authenticate(socketId, channelName, {
      user_id: auth.userId,
    })
    return Response.json(response)
  }

  // Room membership is enforced by AGS at join time (join-by-code), not here — the channel only
  // ever carries progress numbers, so any authenticated user can subscribe.
  if (channelName.startsWith('private-room-')) {
    const response = authenticate(socketId, channelName)
    return Response.json(response)
  }

  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
