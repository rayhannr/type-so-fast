import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export const trigger = (channel: string, event: string, data: unknown) =>
  pusher.trigger(channel, event, data)

export const authenticate = (socketId: string, channel: string, presenceData?: Pusher.PresenceChannelData) =>
  pusher.authorizeChannel(socketId, channel, presenceData)
